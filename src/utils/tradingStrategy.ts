
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
  
  return [NaN, ...rsi]; // Add NaN at the beginning to match price array length
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

// Main Trading Strategy
const generateSignals = (data: BacktestData[], indicators: TechnicalIndicators): ('buy' | 'sell' | 'hold')[] => {
  const signals: ('buy' | 'sell' | 'hold')[] = [];
  
  for (let i = 0; i < data.length; i++) {
    let signal: 'buy' | 'sell' | 'hold' = 'hold';
    
    // Skip if we don't have enough data for indicators
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
    
    // Multi-factor strategy
    let buySignals = 0;
    let sellSignals = 0;
    
    // 1. Moving Average Crossover
    if (currentSMA20 > currentSMA50 && prevSMA20 <= prevSMA50) {
      buySignals++;
    } else if (currentSMA20 < currentSMA50 && prevSMA20 >= prevSMA50) {
      sellSignals++;
    }
    
    // 2. RSI Oversold/Overbought
    if (currentRSI < 30) {
      buySignals++;
    } else if (currentRSI > 70) {
      sellSignals++;
    }
    
    // 3. MACD Signal
    if (macdLine > macdSignal && indicators.macd.macd[i-1] <= indicators.macd.signal[i-1]) {
      buySignals++;
    } else if (macdLine < macdSignal && indicators.macd.macd[i-1] >= indicators.macd.signal[i-1]) {
      sellSignals++;
    }
    
    // 4. Bollinger Bands
    if (currentPrice <= bollingerLower) {
      buySignals++;
    } else if (currentPrice >= bollingerUpper) {
      sellSignals++;
    }
    
    // 5. Price momentum
    const priceChange = (currentPrice - data[i-5]?.close) / data[i-5]?.close * 100;
    if (priceChange > 2) {
      buySignals++;
    } else if (priceChange < -2) {
      sellSignals++;
    }
    
    // Decision logic - require at least 2 signals
    if (buySignals >= 2 && buySignals > sellSignals) {
      signal = 'buy';
    } else if (sellSignals >= 2 && sellSignals > buySignals) {
      signal = 'sell';
    }
    
    signals.push(signal);
  }
  
  return signals;
};

// Run Backtest
export const runBacktest = (data: BacktestData[]): StrategyMetrics => {
  console.log('Starting backtest with', data.length, 'data points');
  
  const initialCapital = 10000; // $10,000 initial capital
  let capital = initialCapital;
  let position = 0; // BTC position
  let positionValue = 0;
  const trades: Trade[] = [];
  const equityCurve: { timestamp: string; equity: number; drawdown: number }[] = [];
  
  // Calculate indicators
  const indicators = calculateIndicators(data);
  
  // Generate trading signals
  const signals = generateSignals(data, indicators);
  
  let maxEquity = initialCapital;
  
  for (let i = 1; i < data.length; i++) {
    const currentData = data[i];
    const signal = signals[i];
    const price = currentData.close;
    
    // Calculate current equity
    const currentEquity = capital + (position * price);
    
    // Update max equity and calculate drawdown
    maxEquity = Math.max(maxEquity, currentEquity);
    const drawdown = (maxEquity - currentEquity) / maxEquity * 100;
    
    equityCurve.push({
      timestamp: currentData.timestamp,
      equity: currentEquity,
      drawdown: drawdown
    });
    
    // Execute trades based on signals
    if (signal === 'buy' && position === 0 && capital > 100) {
      // Buy signal - enter long position
      const quantity = (capital * 0.95) / price; // Use 95% of capital
      position = quantity;
      positionValue = capital * 0.95;
      capital = capital * 0.05; // Keep 5% as cash
      
      trades.push({
        timestamp: currentData.timestamp,
        type: 'buy',
        price: price,
        quantity: quantity
      });
      
      console.log(`Buy signal at ${price}, quantity: ${quantity}`);
      
    } else if (signal === 'sell' && position > 0) {
      // Sell signal - exit long position
      const sellValue = position * price;
      const pnl = sellValue - positionValue;
      capital += sellValue;
      
      trades.push({
        timestamp: currentData.timestamp,
        type: 'sell',
        price: price,
        quantity: position,
        pnl: pnl
      });
      
      console.log(`Sell signal at ${price}, PnL: ${pnl}`);
      
      position = 0;
      positionValue = 0;
    }
  }
  
  // Close any remaining position
  if (position > 0 && data.length > 0) {
    const lastPrice = data[data.length - 1].close;
    const sellValue = position * lastPrice;
    const pnl = sellValue - positionValue;
    capital += sellValue;
    
    trades.push({
      timestamp: data[data.length - 1].timestamp,
      type: 'sell',
      price: lastPrice,
      quantity: position,
      pnl: pnl
    });
    
    position = 0;
  }
  
  // Calculate metrics
  const finalCapital = capital + (position * data[data.length - 1].close);
  const totalReturn = ((finalCapital - initialCapital) / initialCapital) * 100;
  
  // Calculate annualized return
  const firstDate = new Date(data[0].timestamp);
  const lastDate = new Date(data[data.length - 1].timestamp);
  const yearsElapsed = (lastDate.getTime() - firstDate.getTime()) / (365.25 * 24 * 60 * 60 * 1000);
  const annualizedReturn = (Math.pow(finalCapital / initialCapital, 1 / yearsElapsed) - 1) * 100;
  
  // Calculate win rate and trade statistics
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
  
  // Calculate maximum drawdown
  const maxDrawdown = Math.max(...equityCurve.map(point => point.drawdown));
  
  // Calculate Sharpe ratio (simplified)
  const returns = equityCurve.map((point, i) => 
    i > 0 ? (point.equity - equityCurve[i-1].equity) / equityCurve[i-1].equity : 0
  ).slice(1);
  
  const averageReturn = returns.reduce((sum, ret) => sum + ret, 0) / returns.length;
  const returnStdDev = Math.sqrt(
    returns.reduce((sum, ret) => sum + Math.pow(ret - averageReturn, 2), 0) / returns.length
  );
  const sharpeRatio = returnStdDev > 0 ? (averageReturn / returnStdDev) * Math.sqrt(252) : 0;
  
  console.log('Backtest completed:', {
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
    initialCapital,
    finalCapital,
    trades,
    equityCurve
  };
};
