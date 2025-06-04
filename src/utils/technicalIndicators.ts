
import { BacktestData, TechnicalIndicators } from '@/types/trading';

// Calculate Simple Moving Average
export const calculateSMA = (prices: number[], period: number): number[] => {
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
export const calculateRSI = (prices: number[], period: number = 14): number[] => {
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

// Calculate Exponential Moving Average
export const calculateEMA = (prices: number[], period: number): number[] => {
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

// Calculate MACD
export const calculateMACD = (prices: number[], fastPeriod: number = 12, slowPeriod: number = 26, signalPeriod: number = 9): { macd: number[]; signal: number[]; histogram: number[] } => {
  const ema12 = calculateEMA(prices, fastPeriod);
  const ema26 = calculateEMA(prices, slowPeriod);
  const macd = ema12.map((val, i) => val - ema26[i]);
  const signal = calculateEMA(macd, signalPeriod);
  const histogram = macd.map((val, i) => val - signal[i]);
  
  return { macd, signal, histogram };
};

// Calculate Bollinger Bands
export const calculateBollingerBands = (prices: number[], period: number = 20, stdDev: number = 2) => {
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

// Calculate ATR (Average True Range) for volatility
export const calculateATR = (data: BacktestData[], period: number = 14): number[] => {
  const atr: number[] = [];
  const trueRanges: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const high = data[i].high;
    const low = data[i].low;
    const prevClose = data[i - 1].close;
    
    const tr = Math.max(
      high - low,
      Math.abs(high - prevClose),
      Math.abs(low - prevClose)
    );
    trueRanges.push(tr);
  }
  
  for (let i = 0; i < trueRanges.length; i++) {
    if (i < period - 1) {
      atr.push(NaN);
    } else {
      const avgTR = trueRanges.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      atr.push(avgTR);
    }
  }
  
  return [NaN, ...atr];
};

// Calculate ADX (Average Directional Index) for trend strength
export const calculateADX = (data: BacktestData[], period: number = 14): number[] => {
  const adx: number[] = [];
  const dmPlus: number[] = [];
  const dmMinus: number[] = [];
  
  for (let i = 1; i < data.length; i++) {
    const highDiff = data[i].high - data[i - 1].high;
    const lowDiff = data[i - 1].low - data[i].low;
    
    dmPlus.push(highDiff > lowDiff && highDiff > 0 ? highDiff : 0);
    dmMinus.push(lowDiff > highDiff && lowDiff > 0 ? lowDiff : 0);
  }
  
  const atr = calculateATR(data, period);
  
  for (let i = 0; i < dmPlus.length; i++) {
    if (i < period - 1 || isNaN(atr[i + 1])) {
      adx.push(NaN);
    } else {
      const avgDMPlus = dmPlus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const avgDMMinus = dmMinus.slice(i - period + 1, i + 1).reduce((a, b) => a + b, 0) / period;
      const currentATR = atr[i + 1];
      
      const diPlus = (avgDMPlus / currentATR) * 100;
      const diMinus = (avgDMMinus / currentATR) * 100;
      const dx = Math.abs(diPlus - diMinus) / (diPlus + diMinus) * 100;
      
      adx.push(dx);
    }
  }
  
  return [NaN, ...adx];
};

// Helper functions for statistical calculations
export const calculateMean = (values: number[]): number => {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
};

export const calculateStdDev = (values: number[]): number => {
  const mean = calculateMean(values);
  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
  return Math.sqrt(variance);
};

// Calculate Volume Profile for price-volume analysis
export const calculateVolumeProfile = (data: BacktestData[], bins: number = 20): { price: number; volume: number }[] => {
  const prices = data.map(d => d.close);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = (maxPrice - minPrice) / bins;
  
  const volumeProfile: { price: number; volume: number }[] = [];
  
  for (let i = 0; i < bins; i++) {
    const binPrice = minPrice + (i * priceRange);
    const binVolume = data
      .filter(d => d.close >= binPrice && d.close < binPrice + priceRange)
      .reduce((sum, d) => sum + d.volume, 0);
    
    volumeProfile.push({ price: binPrice, volume: binVolume });
  }
  
  return volumeProfile.sort((a, b) => b.volume - a.volume);
};

// Detect candle patterns
export const detectCandlePattern = (data: BacktestData[], index: number): string | null => {
  if (index < 2) return null;
  
  const current = data[index];
  const prev = data[index - 1];
  const prev2 = data[index - 2];
  
  const currentBody = Math.abs(current.close - current.open);
  const currentRange = current.high - current.low;
  const prevBody = Math.abs(prev.close - prev.open);
  
  // Hammer pattern
  const lowerShadow = Math.min(current.open, current.close) - current.low;
  const upperShadow = current.high - Math.max(current.open, current.close);
  
  if (lowerShadow > currentBody * 2 && upperShadow < currentBody * 0.5 && current.close < prev.close) {
    return 'hammer';
  }
  
  // Engulfing pattern
  if (current.close > current.open && prev.close < prev.open && 
      current.open < prev.close && current.close > prev.open) {
    return 'bullish_engulfing';
  }
  
  if (current.close < current.open && prev.close > prev.open && 
      current.open > prev.close && current.close < prev.open) {
    return 'bearish_engulfing';
  }
  
  return null;
};

// Calculate Technical Indicators
export const calculateIndicators = (data: BacktestData[]): TechnicalIndicators => {
  const closePrices = data.map(d => d.close);
  
  return {
    sma20: calculateSMA(closePrices, 20),
    sma50: calculateSMA(closePrices, 50),
    rsi: calculateRSI(closePrices, 14),
    macd: calculateMACD(closePrices),
    bollinger: calculateBollingerBands(closePrices, 20, 2)
  };
};
