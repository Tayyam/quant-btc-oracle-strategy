
export interface BacktestData {
  timestamp: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface Trade {
  timestamp: string;
  type: 'buy' | 'sell';
  price: number;
  quantity: number;
  pnl?: number;
}

export interface DecisionLog {
  timestamp: string;
  action: 'buy' | 'sell' | 'hold';
  price: number;
  marketTrend: 'bullish' | 'bearish';
  indicators: {
    rsi: number;
    sma20: number;
    sma50: number;
    macdLine: number;
    macdSignal: number;
    bollingerLower: number;
    bollingerUpper: number;
  };
  signals: {
    rsiSignal: string;
    smaSignal: string;
    macdSignal: string;
    bollingerSignal: string;
    priceDropSignal: string;
    volumeSignal: string;
  };
  buyScore: number;
  finalDecision: string;
  reason: string;
}

export interface StrategyMetrics {
  totalReturn: number;
  annualizedReturn: number;
  sharpeRatio: number;
  maxDrawdown: number;
  winRate: number;
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  averageWin: number;
  averageLoss: number;
  profitFactor: number;
  initialCapital: number;
  finalCapital: number;
  trades: Trade[];
  equityCurve: { timestamp: string; equity: number; drawdown: number }[];
  decisionLogs: DecisionLog[];
}

export interface TechnicalIndicators {
  sma20: number[];
  sma50: number[];
  rsi: number[];
  macd: {
    macd: number[];
    signal: number[];
    histogram: number[];
  };
  bollinger: {
    upper: number[];
    middle: number[];
    lower: number[];
  };
}
