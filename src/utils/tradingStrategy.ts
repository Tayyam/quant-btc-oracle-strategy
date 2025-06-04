
import { BacktestData, Trade, StrategyMetrics, TechnicalIndicators } from '@/types/trading';

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
const calculateRSI = (prices: number[], period: number = 14): number[] => {
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
  const ema12 = calculateEMA(prices, 12);
  const ema26 = calculateEMA(prices, 26);
  const macd = ema12.map((val, i) => val - ema26[i]);
  const signal = calculateEMA(macd, 9);
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
const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2) => {
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
    sma20: calculateSMA(closePrices, 20),
    sma50: calculateSMA(closePrices, 50),
    rsi: calculateRSI(closePrices),
    macd: calculateMACD(closePrices),
    bollinger: calculateBollingerBands(closePrices)
  };
};

// Risk Management System with Grid Strategy
class RiskManager {
  private initialCapital: number;
  private leverage: number = 2;
  private liquidationPrice: number = 30000;
  private gridCount: number = 8;
  private maxPositionPerGrid: number;
  
  constructor(initialCapital: number) {
    this.initialCapital = initialCapital;
    // حساب المبلغ الآمن لكل شبكة لتجنب التصفية عند 30 ألف دولار
    this.maxPositionPerGrid = this.calculateMaxPositionPerGrid();
  }
  
  private calculateMaxPositionPerGrid(): number {
    // حساب المبلغ الذي سيؤدي للتصفية عند 30 ألف دولار مع رافعة 2x
    // عند الرافعة 2x، التصفية تحدث عند انخفاض 50% من سعر الدخول
    // إذا كان سعر التصفية 30000، فسعر الدخول الآمن هو 60000
    const safeEntryPrice = this.liquidationPrice * 2; // 60,000
    
    // حساب الحد الأقصى للمبلغ الآمن (نترك هامش أمان 20%)
    const safeCapital = this.initialCapital * 0.8;
    
    // تقسيم على 8 شبكات
    return safeCapital / this.gridCount;
  }
  
  getPositionSize(currentPrice: number, availableCapital: number): number {
    // التأكد من عدم تجاوز الحد الأقصى للشبكة الواحدة
    const maxAllowed = Math.min(this.maxPositionPerGrid, availableCapital * 0.9);
    
    // حساب كمية البيتكوين التي يمكن شراؤها
    return (maxAllowed * this.leverage) / currentPrice;
  }
  
  shouldTakeProfit(currentPrice: number, buyPrice: number, marketTrend: 'bullish' | 'bearish'): boolean {
    const profitPercentage = ((currentPrice - buyPrice) / buyPrice) * 100;
    
    if (marketTrend === 'bullish') {
      return profitPercentage >= 15; // 15% ربح في السوق الصاعد
    } else {
      return profitPercentage >= 8; // 8% ربح في السوق الهابط
    }
  }
}

// Market Trend Analysis
const analyzeMarketTrend = (data: BacktestData[], indicators: TechnicalIndicators, index: number): 'bullish' | 'bearish' => {
  if (index < 50) return 'bullish';
  
  const currentSMA20 = indicators.sma20[index];
  const currentSMA50 = indicators.sma50[index];
  const currentRSI = indicators.rsi[index];
  const macdLine = indicators.macd.macd[index];
  const macdSignal = indicators.macd.signal[index];
  
  let bullishSignals = 0;
  let bearishSignals = 0;
  
  // تحليل المتوسطات المتحركة
  if (currentSMA20 > currentSMA50) bullishSignals++;
  else bearishSignals++;
  
  // تحليل RSI
  if (currentRSI < 50) bearishSignals++;
  else if (currentRSI > 50) bullishSignals++;
  
  // تحليل MACD
  if (macdLine > macdSignal) bullishSignals++;
  else bearishSignals++;
  
  // تحليل الاتجاه العام للسعر (آخر 10 شموع)
  const recentPrices = data.slice(Math.max(0, index - 9), index + 1).map(d => d.close);
  const priceSlope = (recentPrices[recentPrices.length - 1] - recentPrices[0]) / recentPrices.length;
  
  if (priceSlope > 0) bullishSignals++;
  else bearishSignals++;
  
  return bullishSignals > bearishSignals ? 'bullish' : 'bearish';
};

// Advanced Trading Strategy with Grid System
const generateSignals = (data: BacktestData[], indicators: TechnicalIndicators): ('buy' | 'sell' | 'hold')[] => {
  const signals: ('buy' | 'sell' | 'hold')[] = [];
  
  for (let i = 0; i < data.length; i++) {
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    
    if (i < 50) {
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
    const bollingerUpper = indicators.bollinger.upper[i];
    
    let buyScore = 0;
    
    // إشارات الشراء القوية
    // 1. RSI في منطقة ذروة البيع
    if (currentRSI < 35) buyScore += 2;
    else if (currentRSI < 45) buyScore += 1;
    
    // 2. كسر المتوسط المتحرك للأعلى
    if (currentSMA20 > currentSMA50 && prevSMA20 <= prevSMA50) buyScore += 3;
    
    // 3. MACD إيجابي
    if (macdLine > macdSignal && indicators.macd.macd[i-1] <= indicators.macd.signal[i-1]) buyScore += 2;
    
    // 4. السعر قريب من خط بولينجر السفلي
    if (currentPrice <= bollingerLower * 1.02) buyScore += 2;
    
    // 5. انخفاض حاد في السعر (فرصة شراء)
    const priceDropPercent = ((data[i-5]?.close || currentPrice) - currentPrice) / (data[i-5]?.close || currentPrice) * 100;
    if (priceDropPercent > 3) buyScore += 1;
    if (priceDropPercent > 5) buyScore += 2;
    
    // 6. حجم التداول مرتفع
    const avgVolume = data.slice(Math.max(0, i-10), i).reduce((sum, d) => sum + d.volume, 0) / 10;
    if (data[i].volume > avgVolume * 1.5) buyScore += 1;
    
    // قرار الشراء: نحتاج نقاط كافية
    if (buyScore >= 4) {
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

// Run Enhanced Backtest with Risk Management
export const runBacktest = (data: BacktestData[]): StrategyMetrics => {
  console.log('Starting enhanced backtest with risk management...');
  
  const initialCapital = 10000;
  const riskManager = new RiskManager(initialCapital);
  
  let capital = initialCapital;
  const positions: Position[] = [];
  const trades: Trade[] = [];
  const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
  
  let gridLevel = 0;
  let maxEquity = initialCapital;
  
  // Calculate indicators
  const indicators = calculateIndicators(data);
  const signals = generateSignals(data, indicators);
  
  for (let i = 1; i < data.length; i++) {
    const currentData = data[i];
    const signal = signals[i];
    const price = currentData.close;
    const marketTrend = analyzeMarketTrend(data, indicators, i);
    
    // حساب القيمة الحالية للمحفظة
    const positionsValue = positions.reduce((sum, pos) => sum + (pos.quantity * price), 0);
    const currentEquity = capital + positionsValue;
    
    // تحديث أقصى قيمة وحساب الانخفاض
    maxEquity = Math.max(maxEquity, currentEquity);
    const drawdown = (maxEquity - currentEquity) / maxEquity * 100;
    
    equityCurve.push({
      timestamp: currentData.timestamp,
      equity: currentEquity,
      drawdown: drawdown
    });
    
    // إشارة شراء - استخدام نظام الشبكة
    if (signal === 'buy' && capital > 100 && gridLevel < 8) {
      const positionSize = riskManager.getPositionSize(price, capital);
      const requiredCapital = (positionSize * price) / 2; // مع الرافعة 2x
      
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
        
        console.log(`شراء في الشبكة ${gridLevel}: السعر ${price.toFixed(2)}, الكمية: ${positionSize.toFixed(6)}`);
      }
    }
    
    // فحص مراكز الربح
    const positionsToClose: number[] = [];
    positions.forEach((position, index) => {
      if (riskManager.shouldTakeProfit(price, position.entryPrice, marketTrend)) {
        const sellValue = position.quantity * price;
        const entryValue = (position.quantity * position.entryPrice) / 2; // الرافعة 2x
        const pnl = sellValue - entryValue;
        
        capital += sellValue;
        positionsToClose.push(index);
        
        trades.push({
          timestamp: currentData.timestamp,
          type: 'sell',
          price: price,
          quantity: position.quantity,
          pnl: pnl
        });
        
        console.log(`بيع مربح: السعر ${price.toFixed(2)}, الربح: ${pnl.toFixed(2)}`);
      }
    });
    
    // إزالة المراكز المغلقة
    positionsToClose.reverse().forEach(index => {
      positions.splice(index, 1);
      gridLevel = Math.max(0, gridLevel - 1);
    });
  }
  
  // إغلاق المراكز المتبقية
  if (positions.length > 0 && data.length > 0) {
    const lastPrice = data[data.length - 1].close;
    positions.forEach(position => {
      const sellValue = position.quantity * lastPrice;
      const entryValue = (position.quantity * position.entryPrice) / 2;
      const pnl = sellValue - entryValue;
      
      capital += sellValue;
      
      trades.push({
        timestamp: data[data.length - 1].timestamp,
        type: 'sell',
        price: lastPrice,
        quantity: position.quantity,
        pnl: pnl
      });
    });
  }
  
  // حساب المقاييس
  const finalCapital = capital;
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
  
  console.log('Enhanced backtest completed:', {
    totalTrades: trades.length,
    totalReturn,
    winRate,
    finalCapital,
    riskManagement: 'Grid System with 2x Leverage'
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
