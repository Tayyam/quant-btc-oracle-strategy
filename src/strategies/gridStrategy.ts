
import { BacktestData, Trade, StrategyMetrics, TechnicalIndicators } from '@/types/trading';
import { calculateIndicators } from '@/utils/technicalIndicators';

// ===== استراتيجية رقم 1: Grid Strategy =====
export const GRID_STRATEGY_PARAMETERS = {
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

// Risk Management System with Grid Strategy
class RiskManager {
  private initialCapital: number;
  private leverage: number;
  private liquidationPrice: number;
  private gridCount: number;
  private maxPositionPerGrid: number;
  
  constructor(initialCapital: number) {
    this.initialCapital = initialCapital;
    this.leverage = GRID_STRATEGY_PARAMETERS.LEVERAGE;
    this.liquidationPrice = GRID_STRATEGY_PARAMETERS.LIQUIDATION_PRICE;
    this.gridCount = GRID_STRATEGY_PARAMETERS.GRID_COUNT;
    this.maxPositionPerGrid = this.calculateMaxPositionPerGrid();
  }
  
  private calculateMaxPositionPerGrid(): number {
    const safeEntryPrice = this.liquidationPrice * 2;
    const safeCapital = this.initialCapital * GRID_STRATEGY_PARAMETERS.SAFE_CAPITAL_RATIO;
    return safeCapital / this.gridCount;
  }
  
  getPositionSize(currentPrice: number, availableCapital: number): number {
    const maxAllowed = Math.min(this.maxPositionPerGrid, availableCapital * GRID_STRATEGY_PARAMETERS.POSITION_CAPITAL_RATIO);
    return (maxAllowed * this.leverage) / currentPrice;
  }
  
  shouldTakeProfit(currentPrice: number, buyPrice: number): boolean {
    return currentPrice > buyPrice;
  }
}

// Market Trend Analysis
const analyzeMarketTrend = (data: BacktestData[], indicators: TechnicalIndicators, index: number): 'bullish' | 'bearish' => {
  if (index < GRID_STRATEGY_PARAMETERS.SMA_LONG_PERIOD) return 'bullish';
  
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
  
  const recentPrices = data.slice(Math.max(0, index - GRID_STRATEGY_PARAMETERS.TREND_ANALYSIS_PERIOD), index + 1).map(d => d.close);
  const priceSlope = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices.length;
  
  if (priceSlope > 0) bullishSignals++;
  else bearishSignals++;
  
  return bullishSignals > bearishSignals ? 'bullish' : 'bearish';
};

// تحليل إشارات هبوط السوق
const detectMarketDownturn = (data: BacktestData[], indicators: TechnicalIndicators, index: number): { shouldSell: boolean; reason: string; confidence: number } => {
  if (index < GRID_STRATEGY_PARAMETERS.MIN_DATA_POINTS) return { shouldSell: false, reason: 'بيانات غير كافية', confidence: 0 };
  
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
  if (currentRSI > GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_STRONG) {
    sellScore += 3;
    reasons.push(`RSI في ذروة الشراء (>${GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_STRONG})`);
  } else if (currentRSI > GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_MEDIUM) {
    sellScore += 1;
    reasons.push(`RSI مرتفع (>${GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.RSI_OVERBOUGHT_MEDIUM})`);
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
  if (currentPrice >= bollingerUpper * GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.BOLLINGER_UPPER_BUFFER) {
    sellScore += 2;
    reasons.push('السعر قريب من خط بولينجر العلوي');
  }
  
  // 5. انخفاض حاد في الحجم (ضعف في الزخم)
  const avgVolume = data.slice(Math.max(0, index - GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD), index).reduce((sum, d) => sum + d.volume, 0) / GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD;
  if (data[index].volume < avgVolume * GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.VOLUME_DROP_THRESHOLD) {
    sellScore += 1;
    reasons.push('انخفاض حجم التداول');
  }
  
  // 6. تحليل الشموع - شمعة هابطة قوية
  const currentCandle = data[index];
  const bodySize = Math.abs(currentCandle.close - currentCandle.open);
  const candleRange = currentCandle.high - currentCandle.low;
  const bodyPercentage = bodySize / candleRange;
  
  if (currentCandle.close < currentCandle.open && bodyPercentage > GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.CANDLE_BODY_THRESHOLD) {
    sellScore += 2;
    reasons.push('شمعة هابطة قوية');
  }
  
  // 7. نمط هبوط متتالي في الأسعار
  const last5Prices = data.slice(index - 4, index + 1).map(d => d.close);
  const decliningCount = last5Prices.reduce((count, price, i) => {
    if (i > 0 && price < last5Prices[i - 1]) count++;
    return count;
  }, 0);
  
  if (decliningCount >= GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.DECLINING_CANDLES_THRESHOLD) {
    sellScore += 2;
    reasons.push(`انخفاض متتالي في ${decliningCount} من آخر 5 شموع`);
  }
  
  // 8. RSI يشكل divergence هابط
  const priceHigh = Math.max(...data.slice(index - GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD, index + 1).map(d => d.high));
  const rsiHigh = Math.max(...indicators.rsi.slice(index - GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.LOOKBACK_PERIOD, index + 1).filter(r => !isNaN(r)));
  const currentPricePosition = currentPrice / priceHigh;
  const currentRSIPosition = currentRSI / rsiHigh;
  
  if (currentPricePosition > GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.PRICE_HIGH_POSITION && currentRSIPosition < GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.RSI_HIGH_POSITION) {
    sellScore += 2;
    reasons.push('تباعد هابط بين السعر و RSI');
  }
  
  // حساب مستوى الثقة
  const confidence = Math.min(sellScore * 10, 100);
  
  // قرار البيع: نحتاج نقاط كافية
  const shouldSell = sellScore >= GRID_STRATEGY_PARAMETERS.SELL_SIGNALS.MIN_SELL_SCORE;
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
    
    if (i < GRID_STRATEGY_PARAMETERS.MIN_DATA_POINTS) {
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
    
    if (currentRSI < GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.RSI_OVERSOLD_STRONG) buyScore += 2;
    else if (currentRSI < GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.RSI_OVERSOLD_WEAK) buyScore += 1;
    
    if (currentSMA20 > currentSMA50 && prevSMA20 <= prevSMA50) buyScore += 3;
    
    if (macdLine > macdSignal && indicators.macd.macd[i-1] <= indicators.macd.signal[i-1]) buyScore += 2;
    
    if (currentPrice <= bollingerLower * GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.BOLLINGER_LOWER_BUFFER) buyScore += 2;
    
    const priceDropPercent = ((data[i-5]?.close || currentPrice) - currentPrice) / (data[i-5]?.close || currentPrice) * 100;
    if (priceDropPercent > GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.PRICE_DROP_THRESHOLD_1) buyScore += 1;
    if (priceDropPercent > GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.PRICE_DROP_THRESHOLD_2) buyScore += 2;
    
    const avgVolume = data.slice(Math.max(0, i-GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.VOLUME_PERIOD), i).reduce((sum, d) => sum + d.volume, 0) / GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.VOLUME_PERIOD;
    if (data[i].volume > avgVolume * GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.VOLUME_MULTIPLIER) buyScore += 1;
    
    if (buyScore >= GRID_STRATEGY_PARAMETERS.BUY_SIGNALS.MIN_BUY_SCORE) {
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
export const runGridStrategy = (data: BacktestData[]): StrategyMetrics => {
  console.log('Starting Strategy 1: Enhanced Grid Strategy...');
  
  const initialCapital = GRID_STRATEGY_PARAMETERS.INITIAL_CAPITAL;
  const riskManager = new RiskManager(initialCapital);
  const leverage = GRID_STRATEGY_PARAMETERS.LEVERAGE;
  
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
    if (signal === 'buy' && capital > 100 && gridLevel < GRID_STRATEGY_PARAMETERS.GRID_COUNT) {
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
