
import { BacktestData, Trade, StrategyMetrics, TechnicalIndicators } from '@/types/trading';
import { calculateIndicators } from '@/utils/technicalIndicators';

// ===== استراتيجية رقم 2: Smart DCA (Buy Only - Hold Forever) =====
export const SMART_DCA_PARAMETERS = {
  // معاملات رأس المال الأساسي
  INITIAL_CAPITAL: 10000,
  
  // معاملات توزيع رأس المال حسب الإطار الزمني
  TIMEFRAME_OPTIONS: {
    '3months': {
      totalInvestments: 12, // 12 صفقة خلال 3 أشهر (أسبوعيًا)
      intervalDays: 7,
      capitalReservationRatio: 0.4, // احتفظ بـ 40% للفرص الذهبية
      description: '3 أشهر - شراء أسبوعي'
    },
    '6months': {
      totalInvestments: 24, // 24 صفقة خلال 6 أشهر (أسبوعيًا)
      intervalDays: 7,
      capitalReservationRatio: 0.5, // احتفظ بـ 50% للفرص الذهبية
      description: '6 أشهر - شراء أسبوعي'
    },
    '1year': {
      totalInvestments: 24, // 24 صفقة خلال سنة (كل أسبوعين)
      intervalDays: 15,
      capitalReservationRatio: 0.6, // احتفظ بـ 60% للفرص الذهبية
      description: 'سنة واحدة - شراء نصف شهري'
    },
    '5years': {
      totalInvestments: 60, // 60 صفقة خلال 5 سنوات (شهريًا)
      intervalDays: 30,
      capitalReservationRatio: 0.7, // احتفظ بـ 70% للفرص الذهبية
      description: '5 سنوات - شراء شهري'
    }
  } as const,

  // معاملات جاذبية الصفقة (Deal Attractiveness)
  ATTRACTIVENESS_FACTORS: {
    // RSI - كلما انخفض RSI، زادت الجاذبية
    RSI_WEIGHT: 25, // وزن RSI في القرار (25%)
    RSI_OVERSOLD_THRESHOLD: 30,
    RSI_EXTREME_OVERSOLD: 20,
    
    // بولينجر باندز - القرب من الخط السفلي
    BOLLINGER_WEIGHT: 20, // وزن بولينجر (20%)
    BOLLINGER_LOWER_MULTIPLIER: 1.02, // 2% فوق الخط السفلي كحد أقصى للشراء المثالي
    
    // انخفاض السعر من القمة الأخيرة
    PRICE_DROP_WEIGHT: 20, // وزن انخفاض السعر (20%)
    PRICE_DROP_LOOKBACK: 30, // النظر للخلف 30 يوم لحساب أعلى سعر
    SIGNIFICANT_DROP_THRESHOLD: 10, // انخفاض 10% يعتبر فرصة جيدة
    MAJOR_DROP_THRESHOLD: 20, // انخفاض 20% يعتبر فرصة ذهبية
    
    // MACD - إشارة الانعكاس المحتمل
    MACD_WEIGHT: 15, // وزن MACD (15%)
    
    // الحجم - ارتفاع الحجم يشير لقوة الحركة
    VOLUME_WEIGHT: 10, // وزن الحجم (10%)
    VOLUME_SPIKE_THRESHOLD: 1.5, // ارتفاع الحجم 1.5x من المتوسط
    VOLUME_LOOKBACK: 14, // متوسط الحجم لآخر 14 يوم
    
    // تحليل الاتجاه العام
    TREND_WEIGHT: 10, // وزن الاتجاه (10%)
    SMA_TREND_PERIOD: 50, // فترة المتوسط المتحرك لتحديد الاتجاه
  },

  // معاملات توزيع رأس المال
  CAPITAL_DISTRIBUTION: {
    MIN_ATTRACTIVENESS_SCORE: 30, // الحد الأدنى لنقاط الجاذبية للشراء
    EXCELLENT_SCORE_THRESHOLD: 80, // نقاط الجاذبية للصفقة الممتازة
    
    // نسب توزيع رأس المال حسب جاذبية الصفقة
    POOR_DEAL_RATIO: 0.3, // 30% من المخصص للصفقة الضعيفة (30-50 نقطة)
    GOOD_DEAL_RATIO: 0.6, // 60% من المخصص للصفقة الجيدة (50-70 نقطة)
    EXCELLENT_DEAL_RATIO: 1.0, // 100% من المخصص للصفقة الممتازة (70+ نقطة)
    
    // استخدام رأس المال الاحتياطي للفرص الذهبية
    GOLDEN_OPPORTUNITY_THRESHOLD: 90, // 90+ نقطة = فرصة ذهبية
    RESERVE_USAGE_RATIO: 0.3, // استخدم 30% من الاحتياطي للفرصة الذهبية
  },

  // فترات التحليل
  ANALYSIS_PERIODS: {
    MIN_DATA_POINTS: 50, // الحد الأدنى لنقاط البيانات
    LOOKBACK_PERIOD: 20, // فترة النظر للخلف للتحليلات العامة
  }
};

// تحليل جاذبية الصفقة الحالية
const calculateDealAttractiveness = (
  data: BacktestData[], 
  indicators: TechnicalIndicators, 
  index: number
): { score: number; factors: Record<string, number>; reason: string } => {
  if (index < SMART_DCA_PARAMETERS.ANALYSIS_PERIODS.MIN_DATA_POINTS) {
    return { score: 0, factors: {}, reason: 'بيانات غير كافية للتحليل' };
  }

  const currentData = data[index];
  const currentPrice = currentData.close;
  const currentRSI = indicators.rsi[index];
  const currentSMA50 = indicators.sma50[index];
  const bollingerLower = indicators.bollinger.lower[index];
  const macdLine = indicators.macd.macd[index];
  const macdSignal = indicators.macd.signal[index];

  let totalScore = 0;
  const factors: Record<string, number> = {};
  const reasons: string[] = [];

  // 1. تحليل RSI (25% من القرار)
  let rsiScore = 0;
  if (currentRSI <= SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.RSI_EXTREME_OVERSOLD) {
    rsiScore = 100; // RSI أقل من 20 = فرصة ذهبية
    reasons.push(`RSI في ذروة البيع الشديد (${currentRSI.toFixed(1)})`);
  } else if (currentRSI <= SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.RSI_OVERSOLD_THRESHOLD) {
    rsiScore = 80; // RSI بين 20-30 = فرصة ممتازة
    reasons.push(`RSI في ذروة البيع (${currentRSI.toFixed(1)})`);
  } else if (currentRSI <= 40) {
    rsiScore = 60; // RSI بين 30-40 = فرصة جيدة
    reasons.push(`RSI منخفض (${currentRSI.toFixed(1)})`);
  } else if (currentRSI <= 50) {
    rsiScore = 40; // RSI بين 40-50 = فرصة متوسطة
    reasons.push(`RSI معتدل (${currentRSI.toFixed(1)})`);
  } else {
    rsiScore = 20; // RSI أعلى من 50 = فرصة ضعيفة
  }
  factors.rsi = rsiScore;
  totalScore += (rsiScore * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.RSI_WEIGHT) / 100;

  // 2. تحليل بولينجر باندز (20% من القرار)
  let bollingerScore = 0;
  const distanceFromLower = (currentPrice - bollingerLower) / bollingerLower;
  if (currentPrice <= bollingerLower * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.BOLLINGER_LOWER_MULTIPLIER) {
    bollingerScore = 100; // السعر قريب جداً من الخط السفلي
    reasons.push('السعر عند خط بولينجر السفلي');
  } else if (distanceFromLower <= 0.05) {
    bollingerScore = 80; // السعر ضمن 5% من الخط السفلي
    reasons.push('السعر قريب من خط بولينجر السفلي');
  } else if (distanceFromLower <= 0.1) {
    bollingerScore = 60; // السعر ضمن 10% من الخط السفلي
  } else {
    bollingerScore = 30; // السعر بعيد عن الخط السفلي
  }
  factors.bollinger = bollingerScore;
  totalScore += (bollingerScore * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.BOLLINGER_WEIGHT) / 100;

  // 3. تحليل انخفاض السعر من القمة (20% من القرار)
  const lookbackPrices = data.slice(
    Math.max(0, index - SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.PRICE_DROP_LOOKBACK), 
    index + 1
  );
  const recentHigh = Math.max(...lookbackPrices.map(d => d.high));
  const priceDropPercent = ((recentHigh - currentPrice) / recentHigh) * 100;
  
  let priceDropScore = 0;
  if (priceDropPercent >= SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.MAJOR_DROP_THRESHOLD) {
    priceDropScore = 100; // انخفاض 20%+ = فرصة ذهبية
    reasons.push(`انخفاض كبير ${priceDropPercent.toFixed(1)}% من القمة`);
  } else if (priceDropPercent >= SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.SIGNIFICANT_DROP_THRESHOLD) {
    priceDropScore = 80; // انخفاض 10-20% = فرصة ممتازة
    reasons.push(`انخفاض جيد ${priceDropPercent.toFixed(1)}% من القمة`);
  } else if (priceDropPercent >= 5) {
    priceDropScore = 60; // انخفاض 5-10% = فرصة جيدة
    reasons.push(`انخفاض متوسط ${priceDropPercent.toFixed(1)}% من القمة`);
  } else {
    priceDropScore = 30; // انخفاض أقل من 5%
  }
  factors.priceDrop = priceDropScore;
  totalScore += (priceDropScore * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.PRICE_DROP_WEIGHT) / 100;

  // 4. تحليل MACD (15% من القرار)
  let macdScore = 50; // نقاط متوسطة كقاعدة
  const prevMACDLine = indicators.macd.macd[index - 1] || 0;
  const prevMACDSignal = indicators.macd.signal[index - 1] || 0;
  
  if (macdLine > macdSignal && prevMACDLine <= prevMACDSignal) {
    macdScore = 90; // إشارة شراء قوية - كسر MACD فوق خط الإشارة
    reasons.push('MACD كسر فوق خط الإشارة');
  } else if (macdLine > macdSignal) {
    macdScore = 70; // MACD إيجابي
  } else if (macdLine < 0 && macdSignal < 0) {
    macdScore = 60; // كلاهما سلبي - قد يكون قاع
  }
  factors.macd = macdScore;
  totalScore += (macdScore * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.MACD_WEIGHT) / 100;

  // 5. تحليل الحجم (10% من القرار)
  const recentVolumes = data.slice(
    Math.max(0, index - SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.VOLUME_LOOKBACK), 
    index
  );
  const avgVolume = recentVolumes.reduce((sum, d) => sum + d.volume, 0) / recentVolumes.length;
  const volumeRatio = currentData.volume / avgVolume;
  
  let volumeScore = 50;
  if (volumeRatio >= SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.VOLUME_SPIKE_THRESHOLD * 2) {
    volumeScore = 90; // حجم عالي جداً
    reasons.push(`حجم تداول مرتفع جداً (${volumeRatio.toFixed(1)}x)`);
  } else if (volumeRatio >= SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.VOLUME_SPIKE_THRESHOLD) {
    volumeScore = 75; // حجم عالي
    reasons.push(`حجم تداول مرتفع (${volumeRatio.toFixed(1)}x)`);
  } else if (volumeRatio >= 1) {
    volumeScore = 60; // حجم طبيعي أو أعلى
  } else {
    volumeScore = 40; // حجم منخفض
  }
  factors.volume = volumeScore;
  totalScore += (volumeScore * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.VOLUME_WEIGHT) / 100;

  // 6. تحليل الاتجاه العام (10% من القرار)
  let trendScore = 50;
  if (currentPrice < currentSMA50) {
    trendScore = 70; // السعر تحت المتوسط = فرصة أفضل للشراء
    reasons.push('السعر تحت المتوسط المتحرك 50');
  } else {
    trendScore = 40; // السعر فوق المتوسط
  }
  factors.trend = trendScore;
  totalScore += (trendScore * SMART_DCA_PARAMETERS.ATTRACTIVENESS_FACTORS.TREND_WEIGHT) / 100;

  const finalScore = Math.min(100, Math.max(0, totalScore));
  const reason = reasons.length > 0 ? reasons.join(' | ') : 'تحليل عام للسوق';

  return { score: finalScore, factors, reason };
};

// حساب حجم الاستثمار بناءً على جاذبية الصفقة ورأس المال المتاح
const calculateInvestmentAmount = (
  attractivenessScore: number,
  baseAmount: number,
  reserveCapital: number,
  timeframeParams: typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS[keyof typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS]
): { amount: number; reserveUsed: number; strategy: string } => {
  let investmentRatio = 0;
  let strategy = '';
  let reserveUsed = 0;

  // تحديد نسبة الاستثمار حسب نقاط الجاذبية
  if (attractivenessScore >= SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.GOLDEN_OPPORTUNITY_THRESHOLD) {
    // فرصة ذهبية - استخدم المخصص كاملاً + جزء من الاحتياطي
    investmentRatio = SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.EXCELLENT_DEAL_RATIO;
    reserveUsed = reserveCapital * SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.RESERVE_USAGE_RATIO;
    strategy = 'فرصة ذهبية - استثمار كامل + احتياطي';
  } else if (attractivenessScore >= SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.EXCELLENT_SCORE_THRESHOLD) {
    // صفقة ممتازة - استخدم المخصص كاملاً
    investmentRatio = SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.EXCELLENT_DEAL_RATIO;
    strategy = 'صفقة ممتازة - استثمار كامل';
  } else if (attractivenessScore >= 50) {
    // صفقة جيدة - استخدم 60% من المخصص
    investmentRatio = SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.GOOD_DEAL_RATIO;
    strategy = 'صفقة جيدة - استثمار متوسط';
  } else if (attractivenessScore >= SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.MIN_ATTRACTIVENESS_SCORE) {
    // صفقة ضعيفة - استخدم 30% من المخصص
    investmentRatio = SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.POOR_DEAL_RATIO;
    strategy = 'صفقة ضعيفة - استثمار محدود';
  } else {
    // تجاهل الصفقة
    return { amount: 0, reserveUsed: 0, strategy: 'تجاهل - جاذبية ضعيفة جداً' };
  }

  const amount = (baseAmount * investmentRatio) + reserveUsed;
  return { amount, reserveUsed, strategy };
};

// تشغيل استراتيجية Smart DCA
export const runSmartDCAStrategy = (
  data: BacktestData[], 
  timeframe: string
): StrategyMetrics => {
  console.log(`Starting Strategy 2: Smart DCA (${timeframe})...`);
  
  const timeframeKey = timeframe as keyof typeof SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS;
  const timeframeParams = SMART_DCA_PARAMETERS.TIMEFRAME_OPTIONS[timeframeKey];
  
  if (!timeframeParams) {
    throw new Error(`Invalid timeframe: ${timeframe}`);
  }

  const initialCapital = SMART_DCA_PARAMETERS.INITIAL_CAPITAL;
  const totalInvestments = timeframeParams.totalInvestments;
  const intervalDays = timeframeParams.intervalDays;
  
  // حساب رأس المال الاحتياطي
  const reserveCapital = initialCapital * timeframeParams.capitalReservationRatio;
  const activeCapital = initialCapital - reserveCapital;
  const baseAmountPerInvestment = activeCapital / totalInvestments;
  
  let remainingActiveCapital = activeCapital;
  let remainingReserveCapital = reserveCapital;
  let totalBTCHoldings = 0;
  let investmentCount = 0;
  
  const trades: Trade[] = [];
  const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
  
  const indicators = calculateIndicators(data);
  const startDate = new Date(data[0].timestamp);
  let nextInvestmentDate = new Date(startDate);
  let maxEquity = initialCapital;

  console.log(`📊 إعداد Smart DCA:`, {
    timeframe: timeframeParams.description,
    totalInvestments,
    intervalDays,
    baseAmountPerInvestment: baseAmountPerInvestment.toFixed(2),
    reserveCapital: reserveCapital.toFixed(2),
    reservationRatio: (timeframeParams.capitalReservationRatio * 100).toFixed(1) + '%'
  });

  for (let i = 0; i < data.length; i++) {
    const currentData = data[i];
    const currentDate = new Date(currentData.timestamp);
    const currentPrice = currentData.close;
    
    // حساب القيمة الحالية للمحفظة
    const btcValue = totalBTCHoldings * currentPrice;
    const totalCash = remainingActiveCapital + remainingReserveCapital;
    const currentEquity = btcValue + totalCash;
    
    maxEquity = Math.max(maxEquity, currentEquity);
    const drawdown = (maxEquity - currentEquity) / maxEquity * 100;
    
    equityCurve.push({
      timestamp: currentData.timestamp,
      equity: currentEquity,
      drawdown: drawdown
    });

    // فحص ما إذا كان الوقت مناسب للاستثمار التالي
    const shouldInvest = currentDate >= nextInvestmentDate && 
                        investmentCount < totalInvestments && 
                        remainingActiveCapital > 0;

    if (shouldInvest) {
      // تحليل جاذبية الصفقة الحالية
      const attractiveness = calculateDealAttractiveness(data, indicators, i);
      
      if (attractiveness.score >= SMART_DCA_PARAMETERS.CAPITAL_DISTRIBUTION.MIN_ATTRACTIVENESS_SCORE) {
        // حساب مبلغ الاستثمار
        const investment = calculateInvestmentAmount(
          attractiveness.score,
          baseAmountPerInvestment,
          remainingReserveCapital,
          timeframeParams
        );
        
        // التأكد من توفر رأس المال
        const availableFunds = remainingActiveCapital + (investment.reserveUsed > 0 ? remainingReserveCapital : 0);
        const actualInvestment = Math.min(investment.amount, availableFunds);
        
        if (actualInvestment > 0) {
          const btcQuantity = actualInvestment / currentPrice;
          
          // تحديث رأس المال
          if (investment.reserveUsed > 0 && actualInvestment > remainingActiveCapital) {
            // استخدمنا جزء من الاحتياطي
            const actualReserveUsed = Math.min(investment.reserveUsed, remainingReserveCapital);
            remainingReserveCapital -= actualReserveUsed;
            remainingActiveCapital = 0;
          } else {
            // استخدمنا فقط من رأس المال النشط
            remainingActiveCapital -= actualInvestment;
          }
          
          totalBTCHoldings += btcQuantity;
          investmentCount++;
          
          // حفظ الصفقة
          trades.push({
            timestamp: currentData.timestamp,
            type: 'buy',
            price: currentPrice,
            quantity: btcQuantity,
          });
          
          console.log(`🟢 استثمار ذكي #${investmentCount}:`, {
            price: currentPrice.toFixed(2),
            amount: actualInvestment.toFixed(2),
            btc: btcQuantity.toFixed(6),
            attractiveness: attractiveness.score.toFixed(1),
            strategy: investment.strategy,
            reason: attractiveness.reason,
            remainingActive: remainingActiveCapital.toFixed(2),
            remainingReserve: remainingReserveCapital.toFixed(2)
          });
          
          // تحديد موعد الاستثمار التالي
          nextInvestmentDate = new Date(currentDate.getTime() + (intervalDays * 24 * 60 * 60 * 1000));
        }
      } else {
        console.log(`⏭️ تجاهل الاستثمار - جاذبية ضعيفة:`, {
          price: currentPrice.toFixed(2),
          attractiveness: attractiveness.score.toFixed(1),
          reason: attractiveness.reason
        });
        
        // تأجيل لليوم التالي بدلاً من تجاهل الفترة كاملة
        nextInvestmentDate = new Date(currentDate.getTime() + (24 * 60 * 60 * 1000));
      }
    }
  }

  // حساب النتائج النهائية
  const finalPrice = data[data.length - 1].close;
  const finalBTCValue = totalBTCHoldings * finalPrice;
  const finalCash = remainingActiveCapital + remainingReserveCapital;
  const finalCapital = finalBTCValue + finalCash;
  
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
  
  const firstDate = new Date(data[0].timestamp);
  const lastDate = new Date(data[data.length - 1].timestamp);
  const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const annualizedReturn = (Math.pow(finalCapital / initialCapital, 1 / yearsElapsed) - 1) * 100;
  
  const maxDrawdown = Math.max(...equityCurve.map(point => point.drawdown));
  
  const returns = equityCurve.map((point, i) => 
    i > 0 ? (point.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity : 0
  ).slice(1);
  
  const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
  );
  const sharpeRatio = returnStdDev > 0 ? (averageReturn / returnStdDev) * Math.sqrt(252) : 0;

  console.log(`📈 Smart DCA Strategy (${timeframe}) completed:`, {
    totalInvestments: investmentCount,
    totalBTCHoldings: totalBTCHoldings.toFixed(6),
    finalBTCValue: finalBTCValue.toFixed(2),
    remainingCash: finalCash.toFixed(2),
    totalReturn: totalReturn.toFixed(2) + '%',
    annualizedReturn: annualizedReturn.toFixed(2) + '%',
    strategy: 'Smart DCA - Buy Only (Hold Forever)'
  });

  return {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    maxDrawdown,
    winRate: 100, // لا يوجد بيع، فجميع الاستثمارات "مفتوحة"
    totalTrades: trades.length,
    winningTrades: trades.length, // جميع الصفقات شراء
    losingTrades: 0,
    averageWin: trades.length > 0 ? (finalBTCValue - (initialCapital - finalCash)) / trades.length : 0,
    averageLoss: 0,
    profitFactor: Infinity, // لا توجد خسائر محققة
    initialCapital,
    finalCapital,
    trades,
    equityCurve
  };
};
