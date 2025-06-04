
import { BacktestData, Trade, StrategyMetrics, TechnicalIndicators } from '@/types/trading';
import { calculateIndicators } from '@/utils/technicalIndicators';

// ===== استراتيجية رقم 2: Smart DCA (Holding Only) =====
export const SMART_DCA_PARAMETERS = {
  // معاملات رأس المال
  INITIAL_CAPITAL: 10000,
  BASE_BUY_AMOUNT: 100, // المبلغ الأساسي للشراء
  MAX_POSITIONS: 50, // الحد الأقصى للمراكز المفتوحة (بدون بيع)
  
  // إعدادات الإطار الزمني (أيام)
  TIMEFRAME_OPTIONS: {
    '3months': 90,
    '6months': 180,
    '1year': 365,
    '5years': 1825
  },
  DEFAULT_TIMEFRAME: '1year' as keyof typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS,
  
  // معاملات إدارة رأس المال الذكي
  CAPITAL_ALLOCATION: {
    // نسبة رأس المال المخصصة للشراء الفوري عند الفرص القوية
    IMMEDIATE_OPPORTUNITY: 0.3, // 30%
    // نسبة رأس المال المحجوزة للمستقبل
    RESERVED_FOR_FUTURE: 0.4, // 40%
    // نسبة رأس المال للشراء العادي
    REGULAR_ALLOCATION: 0.3, // 30%
  },
  
  // معاملات DCA الذكي
  DCA_INTERVAL_DAYS: 7, // فترة الشراء العادية (أيام)
  
  // مضاعفات الشراء حسب جاذبية الصفقة
  DEAL_ATTRACTIVENESS_MULTIPLIERS: {
    VERY_ATTRACTIVE: 4.0,    // صفقة مغرية جداً
    ATTRACTIVE: 2.5,         // صفقة مغرية
    MODERATE: 1.5,           // صفقة متوسطة
    NORMAL: 1.0,             // شراء عادي
    POOR: 0.5,               // صفقة ضعيفة
  },
  
  // معاملات المؤشرات التقنية للـ Smart DCA
  RSI_PERIOD: 14,
  RSI_OVERSOLD: 30,
  RSI_VERY_OVERSOLD: 20,
  RSI_EXTREMELY_OVERSOLD: 15,
  SMA_PERIOD: 20,
  BOLLINGER_PERIOD: 20,
  BOLLINGER_STD_DEV: 2,
  
  // معاملات تقييم جاذبية الصفقة
  DEAL_SCORING: {
    // انخفاض السعر
    PRICE_DROP_5: 5,   // 5% انخفاض
    PRICE_DROP_10: 10, // 10% انخفاض
    PRICE_DROP_15: 15, // 15% انخفاض
    PRICE_DROP_20: 20, // 20% انخفاض
    
    // تقلبات السوق
    VOLATILITY_LOW: 2,    // 2% تقلبات يومية
    VOLATILITY_MEDIUM: 4, // 4% تقلبات يومية
    VOLATILITY_HIGH: 7,   // 7% تقلبات يومية
    
    // حجم التداول
    VOLUME_SPIKE_2X: 2,   // ضعف الحجم العادي
    VOLUME_SPIKE_3X: 3,   // ثلاثة أضعاف الحجم العادي
    VOLUME_SPIKE_5X: 5,   // خمسة أضعاف الحجم العادي
    
    // نسبة السعر من المتوسطات المتحركة
    BELOW_SMA_5: 0.95,   // 95% من SMA
    BELOW_SMA_10: 0.90,  // 90% من SMA
    BELOW_SMA_15: 0.85,  // 85% من SMA
  },
  
  // معاملات توزيع رأس المال حسب الفترة الزمنية
  TIMEFRAME_ALLOCATION: {
    '3months': { aggressive: 0.6, moderate: 0.3, conservative: 0.1 },
    '6months': { aggressive: 0.5, moderate: 0.4, conservative: 0.1 },
    '1year': { aggressive: 0.4, moderate: 0.4, conservative: 0.2 },
    '5years': { aggressive: 0.3, moderate: 0.4, conservative: 0.3 },
  },
};

// Smart DCA Strategy Class
export class SmartDCAStrategy {
  private parameters: typeof SMART_DCA_PARAMETERS;
  private timeframe: keyof typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS;
  private lastBuyDate: Date | null = null;
  private positions: Array<{
    id: string;
    entryPrice: number;
    quantity: number;
    entryTime: string;
    buyReason: string;
    dealAttractiveness: string;
    buyAmount: number;
  }> = [];
  
  // توزيع رأس المال
  private capitalDistribution: {
    immediate: number;
    reserved: number;
    regular: number;
  };
  
  constructor(timeframe: keyof typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS = '1year') {
    this.parameters = SMART_DCA_PARAMETERS;
    this.timeframe = timeframe;
    
    // توزيع رأس المال حسب الإطار الزمني
    this.capitalDistribution = {
      immediate: this.parameters.INITIAL_CAPITAL * this.parameters.CAPITAL_ALLOCATION.IMMEDIATE_OPPORTUNITY,
      reserved: this.parameters.INITIAL_CAPITAL * this.parameters.CAPITAL_ALLOCATION.RESERVED_FOR_FUTURE,
      regular: this.parameters.INITIAL_CAPITAL * this.parameters.CAPITAL_ALLOCATION.REGULAR_ALLOCATION,
    };
  }
  
  // تحليل جاذبية الصفقة
  private analyzeDealAttractiveness(
    data: BacktestData[], 
    indicators: TechnicalIndicators, 
    index: number
  ): { 
    attractiveness: 'very_attractive' | 'attractive' | 'moderate' | 'normal' | 'poor';
    score: number;
    reasons: string[];
    multiplier: number;
  } {
    
    if (index < 20) return { 
      attractiveness: 'normal', 
      score: 0, 
      reasons: ['بيانات غير كافية'], 
      multiplier: this.parameters.DEAL_ATTRACTIVENESS_MULTIPLIERS.NORMAL 
    };
    
    const currentPrice = data[index].close;
    const currentRSI = indicators.rsi[index];
    const currentSMA = indicators.sma20[index];
    const currentVolume = data[index].volume;
    
    // حساب متوسط الحجم
    const avgVolume = data.slice(index - 10, index).reduce((sum, d) => sum + d.volume, 0) / 10;
    
    // حساب التقلبات
    const priceRange = data[index].high - data[index].low;
    const volatility = (priceRange / data[index].open) * 100;
    
    // حساب انخفاض السعر من فترات مختلفة
    const priceWeekAgo = data[Math.max(0, index - 7)]?.close || currentPrice;
    const priceMonthAgo = data[Math.max(0, index - 30)]?.close || currentPrice;
    const priceDropWeek = ((priceWeekAgo - currentPrice) / priceWeekAgo) * 100;
    const priceDropMonth = ((priceMonthAgo - currentPrice) / priceMonthAgo) * 100;
    
    let score = 0;
    const reasons: string[] = [];
    
    // 1. تقييم RSI (40 نقطة كحد أقصى)
    if (currentRSI < this.parameters.RSI_EXTREMELY_OVERSOLD) {
      score += 20;
      reasons.push(`RSI منخفض جداً (${currentRSI.toFixed(1)})`);
    } else if (currentRSI < this.parameters.RSI_VERY_OVERSOLD) {
      score += 15;
      reasons.push(`RSI منخفض جداً (${currentRSI.toFixed(1)})`);
    } else if (currentRSI < this.parameters.RSI_OVERSOLD) {
      score += 10;
      reasons.push(`RSI منخفض (${currentRSI.toFixed(1)})`);
    } else if (currentRSI < 40) {
      score += 5;
      reasons.push(`RSI أقل من المتوسط (${currentRSI.toFixed(1)})`);
    }
    
    // 2. انخفاض السعر (25 نقطة كحد أقصى)
    if (priceDropMonth > this.parameters.DEAL_SCORING.PRICE_DROP_20) {
      score += 15;
      reasons.push(`انخفاض شهري كبير ${priceDropMonth.toFixed(1)}%`);
    } else if (priceDropMonth > this.parameters.DEAL_SCORING.PRICE_DROP_15) {
      score += 12;
      reasons.push(`انخفاض شهري ${priceDropMonth.toFixed(1)}%`);
    } else if (priceDropMonth > this.parameters.DEAL_SCORING.PRICE_DROP_10) {
      score += 8;
      reasons.push(`انخفاض شهري ${priceDropMonth.toFixed(1)}%`);
    } else if (priceDropWeek > this.parameters.DEAL_SCORING.PRICE_DROP_5) {
      score += 5;
      reasons.push(`انخفاض أسبوعي ${priceDropWeek.toFixed(1)}%`);
    }
    
    // 3. السعر مقارنة بالمتوسط المتحرك (15 نقطة كحد أقصى)
    const priceToSMAPercentage = currentPrice / currentSMA;
    if (priceToSMAPercentage < this.parameters.DEAL_SCORING.BELOW_SMA_15) {
      score += 15;
      reasons.push('السعر أقل من 85% من المتوسط المتحرك');
    } else if (priceToSMAPercentage < this.parameters.DEAL_SCORING.BELOW_SMA_10) {
      score += 10;
      reasons.push('السعر أقل من 90% من المتوسط المتحرك');
    } else if (priceToSMAPercentage < this.parameters.DEAL_SCORING.BELOW_SMA_5) {
      score += 5;
      reasons.push('السعر أقل من 95% من المتوسط المتحرك');
    }
    
    // 4. حجم التداول (10 نقاط كحد أقصى)
    const volumeRatio = currentVolume / avgVolume;
    if (volumeRatio > this.parameters.DEAL_SCORING.VOLUME_SPIKE_5X) {
      score += 10;
      reasons.push('ارتفاع هائل في حجم التداول');
    } else if (volumeRatio > this.parameters.DEAL_SCORING.VOLUME_SPIKE_3X) {
      score += 7;
      reasons.push('ارتفاع كبير في حجم التداول');
    } else if (volumeRatio > this.parameters.DEAL_SCORING.VOLUME_SPIKE_2X) {
      score += 4;
      reasons.push('ارتفاع في حجم التداول');
    }
    
    // 5. التقلبات العالية (10 نقاط كحد أقصى)
    if (volatility > this.parameters.DEAL_SCORING.VOLATILITY_HIGH) {
      score += 8;
      reasons.push(`تقلبات عالية ${volatility.toFixed(1)}%`);
    } else if (volatility > this.parameters.DEAL_SCORING.VOLATILITY_MEDIUM) {
      score += 5;
      reasons.push(`تقلبات متوسطة ${volatility.toFixed(1)}%`);
    } else if (volatility > this.parameters.DEAL_SCORING.VOLATILITY_LOW) {
      score += 2;
      reasons.push(`تقلبات خفيفة ${volatility.toFixed(1)}%`);
    }
    
    // تحديد مستوى الجاذبية والمضاعف
    let attractiveness: 'very_attractive' | 'attractive' | 'moderate' | 'normal' | 'poor';
    let multiplier: number;
    
    if (score >= 70) {
      attractiveness = 'very_attractive';
      multiplier = this.parameters.DEAL_ATTRACTIVENESS_MULTIPLIERS.VERY_ATTRACTIVE;
    } else if (score >= 50) {
      attractiveness = 'attractive';
      multiplier = this.parameters.DEAL_ATTRACTIVENESS_MULTIPLIERS.ATTRACTIVE;
    } else if (score >= 30) {
      attractiveness = 'moderate';
      multiplier = this.parameters.DEAL_ATTRACTIVENESS_MULTIPLIERS.MODERATE;
    } else if (score >= 15) {
      attractiveness = 'normal';
      multiplier = this.parameters.DEAL_ATTRACTIVENESS_MULTIPLIERS.NORMAL;
    } else {
      attractiveness = 'poor';
      multiplier = this.parameters.DEAL_ATTRACTIVENESS_MULTIPLIERS.POOR;
    }
    
    return { attractiveness, score, reasons, multiplier };
  }
  
  // تحديد مقدار المال المناسب للشراء
  private calculateBuyAmount(
    attractiveness: string,
    multiplier: number,
    availableCapital: { immediate: number; reserved: number; regular: number }
  ): { amount: number; capitalSource: string } {
    
    let amount = this.parameters.BASE_BUY_AMOUNT * multiplier;
    let capitalSource = 'regular';
    
    // توزيع رأس المال حسب جاذبية الصفقة
    switch (attractiveness) {
      case 'very_attractive':
        // استخدام كل رأس المال المتاح الفوري + جزء من المحجوز
        if (availableCapital.immediate > 0) {
          amount = Math.min(amount, availableCapital.immediate);
          capitalSource = 'immediate';
        } else if (availableCapital.reserved > 0) {
          amount = Math.min(amount, availableCapital.reserved * 0.3); // 30% من المحجوز
          capitalSource = 'reserved';
        } else {
          amount = Math.min(amount, availableCapital.regular);
          capitalSource = 'regular';
        }
        break;
        
      case 'attractive':
        // استخدام رأس المال الفوري أو جزء من المحجوز
        if (availableCapital.immediate > amount) {
          capitalSource = 'immediate';
        } else if (availableCapital.reserved > amount) {
          amount = Math.min(amount, availableCapital.reserved * 0.2); // 20% من المحجوز
          capitalSource = 'reserved';
        } else {
          amount = Math.min(amount, availableCapital.regular);
          capitalSource = 'regular';
        }
        break;
        
      case 'moderate':
        // استخدام رأس المال العادي أولاً
        if (availableCapital.regular > amount) {
          capitalSource = 'regular';
        } else if (availableCapital.immediate > amount) {
          capitalSource = 'immediate';
        } else {
          amount = Math.min(amount, availableCapital.reserved * 0.1); // 10% من المحجوز
          capitalSource = 'reserved';
        }
        break;
        
      case 'normal':
        // رأس المال العادي فقط
        amount = Math.min(amount, availableCapital.regular);
        capitalSource = 'regular';
        break;
        
      case 'poor':
        // تقليل المبلغ أو تجاهل الشراء
        amount = Math.min(amount, availableCapital.regular * 0.5);
        capitalSource = 'regular';
        break;
    }
    
    return { amount, capitalSource };
  }
  
  // تحليل ظروف الشراء الذكي
  private analyzeSmartBuyConditions(
    data: BacktestData[], 
    indicators: TechnicalIndicators, 
    index: number,
    availableCapital: { immediate: number; reserved: number; regular: number }
  ): { 
    shouldBuy: boolean; 
    buyAmount: number; 
    reason: string; 
    confidence: number;
    capitalSource: string;
    dealAttractiveness: string;
  } {
    
    if (index < 20) return { 
      shouldBuy: false, 
      buyAmount: 0, 
      reason: 'بيانات غير كافية', 
      confidence: 0,
      capitalSource: 'regular',
      dealAttractiveness: 'normal'
    };
    
    // فحص الفترة الزمنية للشراء العادي
    const currentDate = new Date(data[index].timestamp);
    const daysSinceLastBuy = this.lastBuyDate ? 
      (currentDate.getTime() - this.lastBuyDate.getTime()) / (1000 * 60 * 60 * 24) : 
      this.parameters.DCA_INTERVAL_DAYS;
    
    // تحليل جاذبية الصفقة
    const dealAnalysis = this.analyzeDealAttractiveness(data, indicators, index);
    
    // تحديد المبلغ المناسب للشراء
    const buyAmountAnalysis = this.calculateBuyAmount(
      dealAnalysis.attractiveness, 
      dealAnalysis.multiplier,
      availableCapital
    );
    
    // شروط الشراء
    let shouldBuy = false;
    let buyScore = 0;
    let reasons: string[] = [];
    
    // 1. الشراء الدوري العادي
    if (daysSinceLastBuy >= this.parameters.DCA_INTERVAL_DAYS) {
      buyScore += 20;
      reasons.push('حان وقت الشراء الدوري');
    }
    
    // 2. الشراء الاستثنائي للصفقات المغرية
    if (dealAnalysis.attractiveness === 'very_attractive') {
      buyScore += 50;
      reasons.push('صفقة مغرية جداً');
    } else if (dealAnalysis.attractiveness === 'attractive') {
      buyScore += 30;
      reasons.push('صفقة مغرية');
    } else if (dealAnalysis.attractiveness === 'moderate') {
      buyScore += 15;
      reasons.push('صفقة جيدة');
    }
    
    // 3. فحص توفر رأس المال
    if (buyAmountAnalysis.amount >= this.parameters.BASE_BUY_AMOUNT * 0.5) {
      buyScore += 10;
      reasons.push('رأس مال متوفر');
    }
    
    // 4. فحص عدد المراكز
    if (this.positions.length < this.parameters.MAX_POSITIONS) {
      buyScore += 10;
      reasons.push('مساحة للمراكز الجديدة');
    }
    
    // قرار الشراء
    shouldBuy = buyScore >= 30 && buyAmountAnalysis.amount >= this.parameters.BASE_BUY_AMOUNT * 0.3;
    
    const confidence = Math.min(buyScore, 100);
    const reason = reasons.concat(dealAnalysis.reasons).join(' | ');
    
    return { 
      shouldBuy, 
      buyAmount: buyAmountAnalysis.amount, 
      reason, 
      confidence,
      capitalSource: buyAmountAnalysis.capitalSource,
      dealAttractiveness: dealAnalysis.attractiveness
    };
  }
  
  // تشغيل استراتيجية Smart DCA
  runStrategy(data: BacktestData[]): StrategyMetrics {
    console.log(`Starting Smart DCA Strategy (${this.timeframe} timeframe)...`);
    
    let availableCapital = { ...this.capitalDistribution };
    const trades: Trade[] = [];
    const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
    
    let maxEquity = this.parameters.INITIAL_CAPITAL;
    
    const indicators = calculateIndicators(data);
    
    for (let i = 1; i < data.length; i++) {
      const currentData = data[i];
      const price = currentData.close;
      
      // حساب قيمة المحفظة الحالية (رأس المال + قيمة المراكز)
      const positionsValue = this.positions.reduce((sum, pos) => {
        const currentValue = pos.quantity * price;
        return sum + currentValue;
      }, 0);
      
      const totalCapital = availableCapital.immediate + availableCapital.reserved + availableCapital.regular;
      const currentEquity = totalCapital + positionsValue;
      maxEquity = Math.max(maxEquity, currentEquity);
      const drawdown = (maxEquity - currentEquity) / maxEquity * 100;
      
      equityCurve.push({
        timestamp: currentData.timestamp,
        equity: currentEquity,
        drawdown: drawdown
      });
      
      // فحص ظروف الشراء الذكي
      const buyAnalysis = this.analyzeSmartBuyConditions(data, indicators, i, availableCapital);
      
      if (buyAnalysis.shouldBuy && buyAnalysis.buyAmount > 0) {
        const quantity = buyAnalysis.buyAmount / price;
        
        const position = {
          id: `smart_dca_${i}`,
          entryPrice: price,
          quantity: quantity,
          entryTime: currentData.timestamp,
          buyReason: buyAnalysis.reason,
          dealAttractiveness: buyAnalysis.dealAttractiveness,
          buyAmount: buyAnalysis.buyAmount
        };
        
        this.positions.push(position);
        
        // خصم المبلغ من المصدر المناسب
        switch (buyAnalysis.capitalSource) {
          case 'immediate':
            availableCapital.immediate -= buyAnalysis.buyAmount;
            break;
          case 'reserved':
            availableCapital.reserved -= buyAnalysis.buyAmount;
            break;
          case 'regular':
            availableCapital.regular -= buyAnalysis.buyAmount;
            break;
        }
        
        this.lastBuyDate = new Date(currentData.timestamp);
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'buy',
          price: price,
          quantity: quantity
        });
        
        console.log(`🟢 شراء DCA ذكي: ${buyAnalysis.reason}, المبلغ: ${buyAnalysis.buyAmount.toFixed(2)}, المصدر: ${buyAnalysis.capitalSource}, الجاذبية: ${buyAnalysis.dealAttractiveness}, الثقة: ${buyAnalysis.confidence}%`);
      }
      
      // إعادة توزيع رأس المال المحجوز تدريجياً (كل شهر)
      const daysSinceStart = (new Date(currentData.timestamp).getTime() - new Date(data[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceStart % 30 === 0 && availableCapital.reserved > 0) {
        const reallocationAmount = availableCapital.reserved * 0.05; // 5% شهرياً
        availableCapital.reserved -= reallocationAmount;
        availableCapital.regular += reallocationAmount;
      }
    }
    
    // حساب المقاييس النهائية
    const totalCapitalSpent = this.parameters.INITIAL_CAPITAL - (availableCapital.immediate + availableCapital.reserved + availableCapital.regular);
    const finalPositionsValue = this.positions.reduce((sum, pos) => {
      const finalPrice = data[data.length - 1].close;
      return sum + (pos.quantity * finalPrice);
    }, 0);
    
    const finalCapital = (availableCapital.immediate + availableCapital.reserved + availableCapital.regular) + finalPositionsValue;
    const totalReturn = ((finalCapital - this.parameters.INITIAL_CAPITAL) / this.parameters.INITIAL_CAPITAL) * 100;
    
    const firstDate = new Date(data[0].timestamp);
    const lastDate = new Date(data[data.length - 1].timestamp);
    const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annualizedReturn = (Math.pow(finalCapital / this.parameters.INITIAL_CAPITAL, 1 / yearsElapsed) - 1) * 100;
    
    // جميع الصفقات هي شراء فقط (لا يوجد بيع)
    const winRate = 100; // نعتبر جميع الشراءات "فائزة" لأننا نحتفظ بها
    const averageWin = finalPositionsValue / this.positions.length; // متوسط قيمة المركز
    const averageLoss = 0; // لا يوجد خسائر محققة
    const profitFactor = totalReturn > 0 ? Infinity : 0;
    
    const maxDrawdown = Math.max(...equityCurve.map(point => point.drawdown));
    
    const returns = equityCurve.map((point, i) => 
      i > 0 ? (point.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity : 0
    ).slice(1);
    
    const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? (averageReturn / returnStdDev) * Math.sqrt(252) : 0;
    
    console.log(`Smart DCA Strategy (${this.timeframe}) completed:`, {
      totalTrades: trades.length,
      totalReturn,
      finalCapital,
      positionsHeld: this.positions.length,
      capitalSpent: totalCapitalSpent,
      remainingCapital: availableCapital.immediate + availableCapital.reserved + availableCapital.regular
    });
    
    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades: trades.length,
      winningTrades: trades.length, // جميع الصفقات هي شراء
      losingTrades: 0, // لا يوجد بيع
      averageWin,
      averageLoss,
      profitFactor,
      initialCapital: this.parameters.INITIAL_CAPITAL,
      finalCapital,
      trades,
      equityCurve
    };
  }
}

// Run Smart DCA Strategy (Strategy 2)
export const runSmartDCAStrategy = (data: BacktestData[], timeframe: keyof typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS = '1year'): StrategyMetrics => {
  const smartDCA = new SmartDCAStrategy(timeframe);
  return smartDCA.runStrategy(data);
};
