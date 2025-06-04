import { BacktestData, Trade, StrategyMetrics, TechnicalIndicators } from '@/types/trading';

// ===== استراتيجية رقم 1: Grid Strategy =====
const STRATEGY_1_PARAMETERS = {
  // معاملات رأس المال وإدارة المخاطر
  INITIAL_CAPITAL: 10000,
  LEVERAGE: 2,
  LIQUIDATION_PRICE: 30000,
  GRID_COUNT: 8,
  SAFE_CAPITAL_RATIO: 0.8,
  POSITION_CAPITAL_RATIO: 0.9,

  // معاملات المؤشرات التقنية — (تم التعديل حسب نتائج Optuna)
  SMA_SHORT_PERIOD: 15,
  SMA_LONG_PERIOD: 43,
  RSI_PERIOD: 23,
  BOLLINGER_PERIOD: 10,
  BOLLINGER_STD_DEV: 2.4,
  EMA_FAST: 14,
  EMA_SLOW: 26,
  MACD_SIGNAL: 14,

  // معاملات إشارات الشراء
  BUY_SIGNALS: {
    RSI_OVERSOLD_STRONG: 35,
    RSI_OVERSOLD_WEAK: 45,
    BOLLINGER_LOWER_BUFFER: 1.02, // 2% فوق الخط السفلي
    PRICE_DROP_THRESHOLD_1: 3, // 3%
    PRICE_DROP_THRESHOLD_2: 5, // 5%
    VOLUME_MULTIPLIER: 1.5, // 1.5x من المتوسط
    VOLUME_PERIOD: 10,
    MIN_BUY_SCORE: 4, // الحد الأدنى لنقاط الشراء
  },

  // معاملات إشارات البيع
  SELL_SIGNALS: {
    RSI_OVERBOUGHT_STRONG: 70,
    RSI_OVERBOUGHT_MEDIUM: 60,
    BOLLINGER_UPPER_BUFFER: 0.98, // 98% من الخط العلوي
    VOLUME_DROP_THRESHOLD: 0.7, // انخفاض الحجم إلى 70%
    CANDLE_BODY_THRESHOLD: 0.7, // 70% من نطاق الشمعة
    DECLINING_CANDLES_THRESHOLD: 3, // 3 شموع متتالية هابطة
    PRICE_HIGH_POSITION: 0.95, // 95% من أعلى سعر
    RSI_HIGH_POSITION: 0.9, // 90% من أعلى RSI
    MIN_SELL_SCORE: 4, // الحد الأدنى لنقاط البيع
    LOOKBACK_PERIOD: 10, // فترة النظر للخلف للتحليل
  },

  // معاملات التحليل العام
  MIN_DATA_POINTS: 50, // الحد الأدنى لنقاط البيانات للتحليل
  TREND_ANALYSIS_PERIOD: 9, // فترة تحليل الاتجاه
};

// ===== استراتيجية رقم 2: Smart DCA =====
const STRATEGY_2_PARAMETERS = {
  // معاملات رأس المال
  INITIAL_CAPITAL: 10000,
  BASE_BUY_AMOUNT: 100, // المبلغ الأساسي للشراء
  MAX_POSITIONS: 20, // الحد الأقصى للمراكز المفتوحة
  
  // معاملات DCA الذكي
  DCA_INTERVAL_DAYS: 7, // فترة الشراء (أيام)
  PRICE_DROP_MULTIPLIER: 1.5, // مضاعف الشراء عند الانخفاض
  VOLATILITY_MULTIPLIER: 1.3, // مضاعف الشراء عند التقلبات العالية
  
  // معاملات المؤشرات التقنية للـ Smart DCA
  RSI_PERIOD: 14,
  RSI_OVERSOLD: 30,
  RSI_VERY_OVERSOLD: 20,
  SMA_PERIOD: 20,
  BOLLINGER_PERIOD: 20,
  BOLLINGER_STD_DEV: 2,
  
  // معاملات الشراء الذكي
  SMART_BUY_CONDITIONS: {
    MIN_PRICE_DROP: 5, // الحد الأدنى لانخفاض السعر 5%
    HIGH_VOLATILITY_THRESHOLD: 3, // 3% تقلبات يومية
    RSI_BUY_THRESHOLD: 35,
    BELOW_SMA_THRESHOLD: 0.95, // 95% من SMA
    VOLUME_SPIKE_MULTIPLIER: 2, // ضعف الحجم العادي
  },
  
  // معاملات البيع
  PROFIT_TARGET: 15, // هدف الربح 15%
  TRAILING_STOP: 5, // وقف الخسارة المتحرك 5%
  MAX_HOLD_DAYS: 60, // الحد الأقصى للاحتفاظ بالمركز
};

// Calculate Simple Moving Average
const calculateSMA = (prices: number[], period: number): number[] => {
  const sma: number[] = [];
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      sma.push(NaN);
    } else {
      const sum = prices.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0);
      sma.push(sum / period);
    }
  }
  return sma;
};

// Calculate RSI
const calculateRSI = (prices: number[], period: number = STRATEGY_1_PARAMETERS.RSI_PERIOD): number[] => {
  const rsi: number[] = [];
  const gains: number[] = [];
  const losses: number[] = [];
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    gains.push(change > 0 ? change : 0);
    losses.push(change < 0 ? Math.abs(change) : 0);
  }
  
  for (let i = 0; i < gains.length; i++) {
    if (i < period - 1) {
      rsi.push(NaN);
    } else {
      const avgGain = gains.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgLoss = losses.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) {
        rsi.push(100);
      } else {
        const rs = avgGain / avgLoss;
        rsi.push(100 - (100 / (1 + rs)));
      }
    }
  }
  
  return [NaN, ...rsi];
};

// Calculate MACD
const calculateMACD = (prices: number[]): { macd: number[]; signal: number[]; histogram: number[] } => {
  const ema12 = calculateEMA(prices, STRATEGY_1_PARAMETERS.EMA_FAST);
  const ema26 = calculateEMA(prices, STRATEGY_1_PARAMETERS.EMA_SLOW);
  const macd = ema12.map((val, i) => val - ema26[i]);
  const signal = calculateEMA(macd, STRATEGY_1_PARAMETERS.MACD_SIGNAL);
  const histogram = macd.map((val, i) => val - signal[i]);
  
  return { macd, signal, histogram };
};

// Calculate Exponential Moving Average
const calculateEMA = (prices: number[], period: number): number[] => {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  
  for (let i = 0; i < prices.length; i++) {
    if (i === 0) {
      ema.push(prices[i]);
    } else {
      ema.push((prices[i] * multiplier) + (ema[i - 1] * (1 - multiplier)));
    }
  }
  
  return ema;
};

// Calculate Bollinger Bands
const calculateBollingerBands = (prices: number[], period: number = STRATEGY_1_PARAMETERS.BOLLINGER_PERIOD, stdDev: number = STRATEGY_1_PARAMETERS.BOLLINGER_STD_DEV) => {
  const sma = calculateSMA(prices, period);
  const upper: number[] = [];
  const lower: number[] = [];
  
  for (let i = 0; i < prices.length; i++) {
    if (i < period - 1) {
      upper.push(NaN);
      lower.push(NaN);
    } else {
      const slice = prices.slice(i - period + 1, i + 1);
      const mean = sma[i];
      const variance = slice.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
      const standardDeviation = Math.sqrt(variance);
      
      upper.push(mean + (standardDeviation * stdDev));
      lower.push(mean - (standardDeviation * stdDev));
    }
  }
  
  return { upper, middle: sma, lower };
};

// Calculate Technical Indicators
const calculateIndicators = (data: BacktestData[]): TechnicalIndicators => {
  const closePrices = data.map(d => d.close);
  
  return {
    sma20: calculateSMA(closePrices, STRATEGY_1_PARAMETERS.SMA_SHORT_PERIOD),
    sma50: calculateSMA(closePrices, STRATEGY_1_PARAMETERS.SMA_LONG_PERIOD),
    rsi: calculateRSI(closePrices, STRATEGY_1_PARAMETERS.RSI_PERIOD),
    macd: calculateMACD(closePrices),
    bollinger: calculateBollingerBands(closePrices, STRATEGY_1_PARAMETERS.BOLLINGER_PERIOD, STRATEGY_1_PARAMETERS.BOLLINGER_STD_DEV)
  };
};

// Risk Management System with Grid Strategy
class RiskManager {
  private initialCapital: number;
  private leverage: number;
  private liquidationPrice: number;
  private gridCount: number;
  private maxPositionPerGrid: number;
  
  constructor(initialCapital: number) {
    this.initialCapital = initialCapital;
    this.leverage = STRATEGY_1_PARAMETERS.LEVERAGE;
    this.liquidationPrice = STRATEGY_1_PARAMETERS.LIQUIDATION_PRICE;
    this.gridCount = STRATEGY_1_PARAMETERS.GRID_COUNT;
    this.maxPositionPerGrid = this.calculateMaxPositionPerGrid();
  }
  
  private calculateMaxPositionPerGrid(): number {
    const safeEntryPrice = this.liquidationPrice * 2;
    const safeCapital = this.initialCapital * STRATEGY_1_PARAMETERS.SAFE_CAPITAL_RATIO;
    return safeCapital / this.gridCount;
  }
  
  getPositionSize(currentPrice: number, availableCapital: number): number {
    const maxAllowed = Math.min(this.maxPositionPerGrid, availableCapital * STRATEGY_1_PARAMETERS.POSITION_CAPITAL_RATIO);
    return (maxAllowed * this.leverage) / currentPrice;
  }
  
  shouldTakeProfit(currentPrice: number, buyPrice: number): boolean {
    return currentPrice > buyPrice;
  }
}

// Market Trend Analysis
const analyzeMarketTrend = (data: BacktestData[], indicators: TechnicalIndicators, index: number): 'bullish' | 'bearish' => {
  if (index < STRATEGY_1_PARAMETERS.SMA_LONG_PERIOD) return 'bullish';
  
  const currentSMA20 = indicators.sma20[index];
  const currentSMA50 = indicators.sma50[index];
  const currentRSI = indicators.rsi[index];
  const macdLine = indicators.macd.macd[index];
  const macdSignal = indicators.macd.signal[index];
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  if (currentSMA20 > currentSMA50) bullishSignals++;
  else bearishSignals++;
  
  if (currentRSI < 50) bearishSignals++;
  else if (currentRSI > 50) bullishSignals++;
  
  if (macdLine > macdSignal) bullishSignals++;
  else bearishSignals++;
  
  const recentPrices = data.slice(Math.max(0, index - STRATEGY_1_PARAMETERS.TREND_ANALYSIS_PERIOD), index + 1).map(d => d.close);
  const priceSlope = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices.length;
  
  if (priceSlope > 0) bullishSignals++;
  else bearishSignals++;
  
  return bullishSignals > bearishSignals ? 'bullish' : 'bearish';
};

// تحليل إشارات هبوط السوق
const detectMarketDownturn = (data: BacktestData[], indicators: TechnicalIndicators, index: number): { shouldSell: boolean; reason: string; confidence: number } => {
  if (index < STRATEGY_1_PARAMETERS.MIN_DATA_POINTS) return { shouldSell: false, reason: 'بيانات غير كافية', confidence: 0 };
  
  const currentRSI = indicators.rsi[index];
  const currentSMA20 = indicators.sma20[index];
  const currentSMA50 = indicators.sma50[index];
  const prevSMA20 = indicators.sma20[index - 1];
  const prevSMA50 = indicators.sma50[index - 1];
  const macdLine = indicators.macd.macd[index];
  const macdSignal = indicators.macd.signal[index];
  const prevMACD = indicators.macd.macd[index - 1];
  const prevMACDSignal = indicators.macd.signal[index - 1];
  const bollingerUpper = indicators.bollinger.upper[index];
  const currentPrice = data[index].close;
  
  let sellScore = 0;
  let reasons: string[] = [];
  
  // 1. RSI في منطقة ذروة الشراء
  if (currentRSI > STRATEGY_1_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_STRONG) {
    sellScore += 3;
    reasons.push(`RSI في ذروة الشراء (>${STRATEGY_1_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_STRONG})`);
  } else if (currentRSI > STRATEGY_1_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_MEDIUM) {
    sellScore += 1;
    reasons.push(`RSI مرتفع (>${STRATEGY_1_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_MEDIUM})`);
  }
  
  // 2. كسر المتوسط المتحرك للأسفل
  if (currentSMA20 < currentSMA50 && prevSMA20 >= prevSMA50) {
    sellScore += 4;
    reasons.push('كسر SMA20 تحت SMA50');
  }
  
  // 3. MACD سلبي أو يتجه للانخفاض
  if (macdLine < macdSignal && prevMACD >= prevMACDSignal) {
    sellScore += 3;
    reasons.push('MACD كسر تحت خط الإشارة');
  }
  
  // 4. السعر قريب من خط بولينجر العلوي (ذروة شراء)
  if (currentPrice >= bollingerUpper * STRATEGY_1_PARAMETERS.SELL_SIGNALS.BOLLINGER_UPPER_BUFFER) {
    sellScore += 2;
    reasons.push('السعر قريب من خط بولينجر العلوي');
  }
  
  // 5. انخفاض حاد في الحجم (ضعف في الزخم)
  const avgVolume = data.slice(Math.max(0, index - STRATEGY_1_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD), index).reduce((sum, d) => sum + d.volume, 0) / STRATEGY_1_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD;
  if (data[index].volume < avgVolume * STRATEGY_1_PARAMETERS.SELL_SIGNALS.VOLUME_DROP_THRESHOLD) {
    sellScore += 1;
    reasons.push('انخفاض حجم التداول');
  }
  
  // 6. تحليل الشموع - شمعة هابطة قوية
  const currentCandle = data[index];
  const bodySize = Math.abs(currentCandle.close - currentCandle.open);
  const candleRange = currentCandle.high - currentCandle.low;
  const bodyPercentage = bodySize / candleRange;
  
  if (currentCandle.close < currentCandle.open && bodyPercentage > STRATEGY_1_PARAMETERS.SELL_SIGNALS.CANDLE_BODY_THRESHOLD) {
    sellScore += 2;
    reasons.push('شمعة هابطة قوية');
  }
  
  // 7. نمط هبوط متتالي في الأسعار
  const last5Prices = data.slice(index - 4, index + 1).map(d => d.close);
  const decliningCount = last5Prices.reduce((count, price, i) => {
    if (i > 0 && price < last5Prices[i - 1]) count++;
    return count;
  }, 0);
  
  if (decliningCount >= STRATEGY_1_PARAMETERS.SELL_SIGNALS.DECLINING_CANDLES_THRESHOLD) {
    sellScore += 2;
    reasons.push(`انخفاض متتالي في ${decliningCount} من آخر 5 شموع`);
  }
  
  // 8. RSI يشكل divergence هابط
  const priceHigh = Math.max(...data.slice(index - STRATEGY_1_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD, index + 1).map(d => d.high));
  const rsiHigh = Math.max(...indicators.rsi.slice(index - STRATEGY_1_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD, index + 1).filter(r => !isNaN(r)));
  const currentPricePosition = currentPrice / priceHigh;
  const currentRSIPosition = currentRSI / rsiHigh;
  
  if (currentPricePosition > STRATEGY_1_PARAMETERS.SELL_SIGNALS.PRICE_HIGH_POSITION && currentRSIPosition < STRATEGY_1_PARAMETERS.SELL_SIGNALS.RSI_HIGH_POSITION) {
    sellScore += 2;
    reasons.push('تباعد هابط بين السعر و RSI');
  }
  
  // حساب مستوى الثقة
  const confidence = Math.min(sellScore * 10, 100);
  
  // قرار البيع: نحتاج نقاط كافية
  const shouldSell = sellScore >= STRATEGY_1_PARAMETERS.SELL_SIGNALS.MIN_SELL_SCORE;
  const reason = reasons.length > 0 ? reasons.join(' | ') : 'لا توجد إشارات بيع قوية';
  
  if (shouldSell) {
    console.log(`🔴 إشارة بيع قوية - النقاط: ${sellScore}, الأسباب: ${reason}, الثقة: ${confidence}%`);
  }
  
  return { shouldSell, reason, confidence };
};

// Advanced Trading Strategy with Grid System
const generateSignals = (data: BacktestData[], indicators: TechnicalIndicators): ('buy' | 'sell' | 'hold')[] => {
  const signals: ('buy' | 'sell' | 'hold')[] = [];
  
  for (let i = 0; i < data.length; i++) {
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    
    if (i < STRATEGY_1_PARAMETERS.MIN_DATA_POINTS) {
      signals.push(signal);
      continue;
    }
    
    const currentRSI = indicators.rsi[i];
    const currentSMA20 = indicators.sma20[i];
    const currentSMA50 = indicators.sma50[i];
    const currentPrice = data[i].close;
    const prevSMA20 = indicators.sma20[i - 1];
    const prevSMA50 = indicators.sma50[i - 1];
    const macdLine = indicators.macd.macd[i];
    const macdSignal = indicators.macd.signal[i];
    const bollingerLower = indicators.bollinger.lower[i];
    
    // فحص إشارات البيع أولاً
    const sellAnalysis = detectMarketDownturn(data, indicators, i);
    if (sellAnalysis.shouldSell) {
      signal = 'sell';
      signals.push(signal);
      continue;
    }
    
    // إشارات الشراء
    let buyScore = 0;
    
    if (currentRSI < STRATEGY_1_PARAMETERS.BUY_SIGNALS.RSI_OVERSOLD_STRONG) buyScore += 2;
    else if (currentRSI < STRATEGY_1_PARAMETERS.BUY_SIGNALS.RSI_OVERSOLD_WEAK) buyScore += 1;
    
    if (currentSMA20 > currentSMA50 && prevSMA20 <= prevSMA50) buyScore += 3;
    
    if (macdLine > macdSignal && indicators.macd.macd[i-1] <= indicators.macd.signal[i-1]) buyScore += 2;
    
    if (currentPrice <= bollingerLower * STRATEGY_1_PARAMETERS.BUY_SIGNALS.BOLLINGER_LOWER_BUFFER) buyScore += 2;
    
    const priceDropPercent = ((data[i-5]?.close || currentPrice) - currentPrice) / (data[i-5]?.close || currentPrice) * 100;
    if (priceDropPercent > STRATEGY_1_PARAMETERS.BUY_SIGNALS.PRICE_DROP_THRESHOLD_1) buyScore += 1;
    if (priceDropPercent > STRATEGY_1_PARAMETERS.BUY_SIGNALS.PRICE_DROP_THRESHOLD_2) buyScore += 2;
    
    const avgVolume = data.slice(Math.max(0, i-STRATEGY_1_PARAMETERS.BUY_SIGNALS.VOLUME_PERIOD), i).reduce((sum, d) => sum + d.volume, 0) / STRATEGY_1_PARAMETERS.BUY_SIGNALS.VOLUME_PERIOD;
    if (data[i].volume > avgVolume * STRATEGY_1_PARAMETERS.BUY_SIGNALS.VOLUME_MULTIPLIER) buyScore += 1;
    
    if (buyScore >= STRATEGY_1_PARAMETERS.BUY_SIGNALS.MIN_BUY_SCORE) {
      signal = 'buy';
    }
    
    signals.push(signal);
  }
  
  return signals;
};

// Position Management
interface Position {
  id: string;
  entryPrice: number;
  quantity: number;
  entryTime: string;
  gridLevel: number;
}

// Run Enhanced Backtest with Risk Management (Strategy 1)
export const runBacktest = (data: BacktestData[]): StrategyMetrics => {
  console.log('Starting Strategy 1: Enhanced Grid Strategy...');
  
  const initialCapital = STRATEGY_1_PARAMETERS.INITIAL_CAPITAL;
  const riskManager = new RiskManager(initialCapital);
  const leverage = STRATEGY_1_PARAMETERS.LEVERAGE;
  
  let capital = initialCapital;
  const positions: Position[] = [];
  const trades: Trade[] = [];
  const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
  
  let gridLevel = 0;
  let maxEquity = initialCapital;
  
  const indicators = calculateIndicators(data);
  const signals = generateSignals(data, indicators);
  
  for (let i = 1; i < data.length; i++) {
    const currentData = data[i];
    const signal = signals[i];
    const price = currentData.close;
    
    // حساب قيمة المحفظة الحالية بشكل صحيح
    const positionsValue = positions.reduce((sum, pos) => {
      const priceChange = price - pos.entryPrice;
      const pnlPerUnit = priceChange * leverage;
      const totalPnl = pnlPerUnit * pos.quantity;
      const entryValue = (pos.quantity * pos.entryPrice) / leverage;
      return sum + entryValue + totalPnl;
    }, 0);
    
    const currentEquity = capital + positionsValue;
    
    maxEquity = Math.max(maxEquity, currentEquity);
    const drawdown = (maxEquity - currentEquity) / maxEquity * 100;
    
    equityCurve.push({
      timestamp: currentData.timestamp,
      equity: currentEquity,
      drawdown: drawdown
    });
    
    // إشارة شراء - استخدام نظام الشبكة
    if (signal === 'buy' && capital > 100 && gridLevel < STRATEGY_1_PARAMETERS.GRID_COUNT) {
      const positionSize = riskManager.getPositionSize(price, capital);
      const requiredCapital = (positionSize * price) / leverage;
      
      if (capital >= requiredCapital) {
        const position: Position = {
          id: `pos_${i}_${gridLevel}`,
          entryPrice: price,
          quantity: positionSize,
          entryTime: currentData.timestamp,
          gridLevel: gridLevel
        };
        
        positions.push(position);
        capital -= requiredCapital;
        gridLevel++;
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'buy',
          price: price,
          quantity: positionSize
        });
        
        console.log(`🟢 شراء في الشبكة ${gridLevel}: السعر ${price.toFixed(2)}, الكمية: ${positionSize.toFixed(6)}`);
      }
    }
    
    // فحص المراكز للبيع - التحليل الفني فقط مع شرط الربح
    const positionsToClose: number[] = [];
    const sellAnalysis = detectMarketDownturn(data, indicators, i);
    
    positions.forEach((position, index) => {
      const priceChange = price - position.entryPrice;
      const pnlPerUnit = priceChange * leverage;
      const totalPnl = pnlPerUnit * position.quantity;
      
      // شرط أساسي: يجب أن يكون هناك ربح
      const isProfit = totalPnl > 0;
      
      // إشارة البيع من التحليل الفني
      const hasAnalyticalSellSignal = sellAnalysis.shouldSell;
      
      // البيع فقط عند الربح + وجود إشارة بيع تحليلية
      if (isProfit && hasAnalyticalSellSignal) {
        const entryValue = (position.quantity * position.entryPrice) / leverage;
        const exitValue = entryValue + totalPnl;
        
        capital += exitValue;
        positionsToClose.push(index);
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'sell',
          price: price,
          quantity: position.quantity,
          pnl: totalPnl
        });
        
        console.log(`💰 بيع مربح بإشارة تحليلية: الدخول ${position.entryPrice.toFixed(2)}, الخروج ${price.toFixed(2)}, P&L: ${totalPnl.toFixed(2)}, السبب: ${sellAnalysis.reason}`);
      } else if (isProfit && !hasAnalyticalSellSignal) {
        console.log(`📈 ربح ولكن لا توجد إشارة بيع تحليلية: P&L: ${totalPnl.toFixed(2)}, انتظار إشارة`);
      } else if (!isProfit) {
        console.log(`⏳ الاحتفاظ بالمركز الخاسر: الدخول ${position.entryPrice.toFixed(2)}, السعر الحالي ${price.toFixed(2)}, P&L: ${totalPnl.toFixed(2)}`);
      }
    });
    
    // إزالة المراكز المغلقة
    positionsToClose.reverse().forEach(index => {
      positions.splice(index, 1);
      gridLevel = Math.max(0, gridLevel - 1);
    });
  }
  
  // إغلاق المراكز المتبقية فقط إذا كانت مربحة في نهاية فترة الاختبار
  if (positions.length > 0 && data.length > 0) {
    const lastPrice = data[data.length - 1].close;
    const positionsToClose: number[] = [];
    
    positions.forEach((position, index) => {
      const priceChange = lastPrice - position.entryPrice;
      const pnlPerUnit = priceChange * leverage;
      const totalPnl = pnlPerUnit * position.quantity;
      
      // إغلاق فقط المراكز المربحة في نهاية الاختبار
      if (totalPnl > 0) {
        const entryValue = (position.quantity * position.entryPrice) / leverage;
        const exitValue = entryValue + totalPnl;
        
        capital += exitValue;
        positionsToClose.push(index);
        
        trades.push({
          timestamp: data[data.length - 1].timestamp,
          type: 'sell',
          price: lastPrice,
          quantity: position.quantity,
          pnl: totalPnl
        });
        
        console.log(`📈 إغلاق مربح في نهاية الاختبار: P&L ${totalPnl.toFixed(2)}`);
      } else {
        console.log(`📉 ترك مركز خاسر مفتوح: P&L ${totalPnl.toFixed(2)}`);
      }
    });
    
    // إزالة المراكز المغلقة
    positionsToClose.reverse().forEach(index => {
      positions.splice(index, 1);
    });
  }
  
  // حساب رأس المال النهائي مع المراكز المفتوحة
  let finalCapital = capital;
  if (positions.length > 0 && data.length > 0) {
    const lastPrice = data[data.length - 1].close;
    const openPositionsValue = positions.reduce((sum, pos) => {
      const priceChange = lastPrice - pos.entryPrice;
      const pnlPerUnit = priceChange * leverage;
      const totalPnl = pnlPerUnit * pos.quantity;
      const entryValue = (pos.quantity * pos.entryPrice) / leverage;
      return sum + entryValue + totalPnl;
    }, 0);
    finalCapital += openPositionsValue;
    
    console.log(`📊 المراكز المفتوحة المتبقية: ${positions.length}, قيمتها: ${openPositionsValue.toFixed(2)}`);
  }
  
  // حساب المقاييس
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
  
  const firstDate = new Date(data[0].timestamp);
  const lastDate = new Date(data[data.length - 1].timestamp);
  const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const annualizedReturn = (Math.pow(finalCapital / initialCapital, 1 / yearsElapsed) - 1) * 100;
  
  const profitableTrades = trades.filter(trade => trade.pnl && trade.pnl > 0);
  const losingTrades = trades.filter(trade => trade.pnl && trade.pnl < 0);
  const sellTrades = trades.filter(trade => trade.type === 'sell');
  
  const winRate = sellTrades.length > 0 ? (profitableTrades.length / sellTrades.length) * 100 : 0;
  const averageWin = profitableTrades.length > 0 ? 
    profitableTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / profitableTrades.length : 0;
  const averageLoss = losingTrades.length > 0 ? 
    Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / losingTrades.length) : 0;
  
  const totalProfit = profitableTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
  const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
  const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
  
  const maxDrawdown = Math.max(...equityCurve.map(point => point.drawdown));
  
  const returns = equityCurve.map((point, i) => 
    i > 0 ? (point.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity : 0
  ).slice(1);
  
  const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
  );
  const sharpeRatio = returnStdDev > 0 ? (averageReturn / returnStdDev) * Math.sqrt(252) : 0;
  
  console.log('Strategy 1: Enhanced Grid Strategy completed:', {
    totalTrades: trades.length,
    totalReturn,
    winRate,
    finalCapital,
    openPositions: positions.length,
    strategy: 'Grid System - Profit Only Selling'
  });
  
  return {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    maxDrawdown,
    winRate,
    totalTrades: trades.length,
    winningTrades: profitableTrades.length,
    losingTrades: losingTrades.length,
    averageWin,
    averageLoss,
    profitFactor,
    initialCapital,
    finalCapital,
    trades,
    equityCurve
  };
};

// Smart DCA Strategy Implementation
class SmartDCAStrategy {
  private parameters: typeof STRATEGY_2_PARAMETERS;
  private lastBuyDate: Date | null = null;
  private positions: Array<{
    id: string;
    entryPrice: number;
    quantity: number;
    entryTime: string;
    buyReason: string;
  }> = [];
  
  constructor() {
    this.parameters = STRATEGY_2_PARAMETERS;
  }
  
  // تحليل ظروف الشراء الذكي
  private analyzeSmartBuyConditions(
    data: BacktestData[], 
    indicators: TechnicalIndicators, 
    index: number
  ): { shouldBuy: boolean; buyAmount: number; reason: string; confidence: number } {
    
    if (index < 20) return { shouldBuy: false, buyAmount: 0, reason: 'بيانات غير كافية', confidence: 0 };
    
    const currentPrice = data[index].close;
    const currentRSI = indicators.rsi[index];
    const currentSMA = indicators.sma20[index];
    const currentVolume = data[index].volume;
    
    // حساب متوسط الحجم
    const avgVolume = data.slice(index - 10, index).reduce((sum, d) => sum + d.volume, 0) / 10;
    
    // حساب التقلبات
    const priceRange = data[index].high - data[index].low;
    const volatility = (priceRange / data[index].open) * 100;
    
    // حساب انخفاض السعر من آخر 7 أيام
    const priceWeekAgo = data[Math.max(0, index - 7)]?.close || currentPrice;
    const priceDropPercent = ((priceWeekAgo - currentPrice) / priceWeekAgo) * 100;
    
    let buyScore = 0;
    let buyAmount = this.parameters.BASE_BUY_AMOUNT;
    const reasons: string[] = [];
    
    // 1. فحص الفترة الزمنية للشراء العادي
    const currentDate = new Date(data[index].timestamp);
    const daysSinceLastBuy = this.lastBuyDate ? 
      (currentDate.getTime() - this.lastBuyDate.getTime()) / (1000 * 60 * 60 * 24) : 
      this.parameters.DCA_INTERVAL_DAYS;
    
    if (daysSinceLastBuy >= this.parameters.DCA_INTERVAL_DAYS) {
      buyScore += 2;
      reasons.push('حان وقت الشراء الدوري');
    }
    
    // 2. RSI في منطقة ذروة البيع
    if (currentRSI < this.parameters.RSI_VERY_OVERSOLD) {
      buyScore += 4;
      buyAmount *= 2;
      reasons.push(`RSI منخفض جداً (${currentRSI.toFixed(1)})`);
    } else if (currentRSI < this.parameters.RSI_OVERSOLD) {
      buyScore += 2;
      buyAmount *= 1.5;
      reasons.push(`RSI منخفض (${currentRSI.toFixed(1)})`);
    }
    
    // 3. السعر تحت المتوسط المتحرك
    if (currentPrice < currentSMA * this.parameters.SMART_BUY_CONDITIONS.BELOW_SMA_THRESHOLD) {
      buyScore += 2;
      buyAmount *= 1.3;
      reasons.push('السعر تحت المتوسط المتحرك');
    }
    
    // 4. انخفاض كبير في السعر
    if (priceDropPercent > this.parameters.SMART_BUY_CONDITIONS.MIN_PRICE_DROP) {
      buyScore += 3;
      buyAmount *= this.parameters.PRICE_DROP_MULTIPLIER;
      reasons.push(`انخفاض السعر ${priceDropPercent.toFixed(1)}%`);
    }
    
    // 5. تقلبات عالية (فرصة شراء)
    if (volatility > this.parameters.SMART_BUY_CONDITIONS.HIGH_VOLATILITY_THRESHOLD) {
      buyScore += 1;
      buyAmount *= this.parameters.VOLATILITY_MULTIPLIER;
      reasons.push(`تقلبات عالية ${volatility.toFixed(1)}%`);
    }
    
    // 6. ارتفاع الحجم (اهتمام السوق)
    if (currentVolume > avgVolume * this.parameters.SMART_BUY_CONDITIONS.VOLUME_SPIKE_MULTIPLIER) {
      buyScore += 2;
      reasons.push('ارتفاع حجم التداول');
    }
    
    // حساب مستوى الثقة
    const confidence = Math.min(buyScore * 12, 100);
    
    // قرار الشراء
    const shouldBuy = buyScore >= 3 && this.positions.length < this.parameters.MAX_POSITIONS;
    const reason = reasons.length > 0 ? reasons.join(' | ') : 'شراء دوري عادي';
    
    return { shouldBuy, buyAmount, reason, confidence };
  }
  
  // تحليل ظروف البيع
  private analyzeSellConditions(
    data: BacktestData[], 
    currentPrice: number, 
    position: any,
    index: number
  ): { shouldSell: boolean; reason: string } {
    
    const entryPrice = position.entryPrice;
    const profitPercent = ((currentPrice - entryPrice) / entryPrice) * 100;
    
    // البيع عند تحقيق هدف الربح
    if (profitPercent >= this.parameters.PROFIT_TARGET) {
      return { shouldSell: true, reason: `تحقيق هدف الربح ${profitPercent.toFixed(1)}%` };
    }
    
    // حساب أعلى سعر وصل إليه السهم منذ الشراء
    const entryIndex = data.findIndex(d => d.timestamp === position.entryTime);
    if (entryIndex >= 0) {
      const pricesAfterEntry = data.slice(entryIndex, index + 1).map(d => d.close);
      const highestPrice = Math.max(...pricesAfterEntry);
      const drawdownFromHigh = ((highestPrice - currentPrice) / highestPrice) * 100;
      
      // وقف الخسارة المتحرك
      if (drawdownFromHigh > this.parameters.TRAILING_STOP && profitPercent > 0) {
        return { shouldSell: true, reason: `وقف الخسارة المتحرك ${drawdownFromHigh.toFixed(1)}%` };
      }
    }
    
    // البيع بعد فترة طويلة إذا كان هناك ربح
    const daysSinceEntry = (new Date(data[index].timestamp).getTime() - new Date(position.entryTime).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceEntry > this.parameters.MAX_HOLD_DAYS && profitPercent > 0) {
      return { shouldSell: true, reason: `احتفاظ طويل مع ربح ${profitPercent.toFixed(1)}%` };
    }
    
    return { shouldSell: false, reason: 'الاحتفاظ بالمركز' };
  }
  
  // تشغيل استراتيجية Smart DCA
  runStrategy(data: BacktestData[]): StrategyMetrics {
    console.log('Starting Smart DCA Strategy...');
    
    let capital = this.parameters.INITIAL_CAPITAL;
    const trades: Trade[] = [];
    const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
    
    let maxEquity = this.parameters.INITIAL_CAPITAL;
    
    const indicators = calculateIndicators(data);
    
    for (let i = 1; i < data.length; i++) {
      const currentData = data[i];
      const price = currentData.close;
      
      // حساب قيمة المحفظة الحالية
      const positionsValue = this.positions.reduce((sum, pos) => {
        const currentValue = pos.quantity * price;
        return sum + currentValue;
      }, 0);
      
      const currentEquity = capital + positionsValue;
      maxEquity = Math.max(maxEquity, currentEquity);
      const drawdown = (maxEquity - currentEquity) / maxEquity * 100;
      
      equityCurve.push({
        timestamp: currentData.timestamp,
        equity: currentEquity,
        drawdown: drawdown
      });
      
      // فحص ظروف البيع للمراكز الموجودة
      const positionsToClose: number[] = [];
      this.positions.forEach((position, index) => {
        const sellAnalysis = this.analyzeSellConditions(data, price, position, i);
        
        if (sellAnalysis.shouldSell) {
          const sellValue = position.quantity * price;
          capital += sellValue;
          
          const pnl = sellValue - (position.quantity * position.entryPrice);
          
          trades.push({
            timestamp: currentData.timestamp,
            type: 'sell',
            price: price,
            quantity: position.quantity,
            pnl: pnl
          });
          
          positionsToClose.push(index);
          console.log(`💰 بيع DCA: ${sellAnalysis.reason}, P&L: ${pnl.toFixed(2)}`);
        }
      });
      
      // إزالة المراكز المباعة
      positionsToClose.reverse().forEach(index => {
        this.positions.splice(index, 1);
      });
      
      // فحص ظروف الشراء الذكي
      const buyAnalysis = this.analyzeSmartBuyConditions(data, indicators, i);
      
      if (buyAnalysis.shouldBuy && capital >= buyAnalysis.buyAmount) {
        const quantity = buyAnalysis.buyAmount / price;
        
        const position = {
          id: `dca_${i}`,
          entryPrice: price,
          quantity: quantity,
          entryTime: currentData.timestamp,
          buyReason: buyAnalysis.reason
        };
        
        this.positions.push(position);
        capital -= buyAnalysis.buyAmount;
        this.lastBuyDate = new Date(currentData.timestamp);
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'buy',
          price: price,
          quantity: quantity
        });
        
        console.log(`🟢 شراء DCA ذكي: ${buyAnalysis.reason}, المبلغ: ${buyAnalysis.buyAmount.toFixed(2)}, الثقة: ${buyAnalysis.confidence}%`);
      }
    }
    
    // إغلاق المراكز المتبقية في نهاية الاختبار
    if (this.positions.length > 0 && data.length > 0) {
      const lastPrice = data[data.length - 1].close;
      
      this.positions.forEach(position => {
        const sellValue = position.quantity * lastPrice;
        capital += sellValue;
        
        const pnl = sellValue - (position.quantity * position.entryPrice);
        
        trades.push({
          timestamp: data[data.length - 1].timestamp,
          type: 'sell',
          price: lastPrice,
          quantity: position.quantity,
          pnl: pnl
        });
      });
      
      this.positions = [];
    }
    
    // حساب المقاييس
    const finalCapital = capital;
    const totalReturn = ((finalCapital - this.parameters.INITIAL_CAPITAL) / this.parameters.INITIAL_CAPITAL) * 100;
    
    const firstDate = new Date(data[0].timestamp);
    const lastDate = new Date(data[data.length - 1].timestamp);
    const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
    const annualizedReturn = (Math.pow(finalCapital / this.parameters.INITIAL_CAPITAL, 1 / yearsElapsed) - 1) * 100;
    
    const profitableTrades = trades.filter(trade => trade.pnl && trade.pnl > 0);
    const losingTrades = trades.filter(trade => trade.pnl && trade.pnl < 0);
    const sellTrades = trades.filter(trade => trade.type === 'sell');
    
    const winRate = sellTrades.length > 0 ? (profitableTrades.length / sellTrades.length) * 100 : 0;
    const averageWin = profitableTrades.length > 0 ? 
      profitableTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / profitableTrades.length : 0;
    const averageLoss = losingTrades.length > 0 ? 
      Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / losingTrades.length) : 0;
    
    const totalProfit = profitableTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0);
    const totalLoss = Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0));
    const profitFactor = totalLoss > 0 ? totalProfit / totalLoss : totalProfit > 0 ? Infinity : 0;
    
    const maxDrawdown = Math.max(...equityCurve.map(point => point.drawdown));
    
    const returns = equityCurve.map((point, i) => 
      i > 0 ? (point.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity : 0
    ).slice(1);
    
    const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
    const returnStdDev = Math.sqrt(
      returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
    );
    const sharpeRatio = returnStdDev > 0 ? (averageReturn / returnStdDev) * Math.sqrt(252) : 0;
    
    console.log('Smart DCA Strategy completed:', {
      totalTrades: trades.length,
      totalReturn,
      winRate,
      finalCapital
    });
    
    return {
      totalReturn,
      annualizedReturn,
      sharpeRatio,
      maxDrawdown,
      winRate,
      totalTrades: trades.length,
      winningTrades: profitableTrades.length,
      losingTrades: losingTrades.length,
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
export const runSmartDCABacktest = (data: BacktestData[]): StrategyMetrics => {
  const smartDCA = new SmartDCAStrategy();
  return smartDCA.runStrategy(data);
};
