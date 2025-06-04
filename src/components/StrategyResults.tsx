import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { StrategyMetrics, BacktestData } from '@/types/trading';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import CandlestickChart from './CandlestickChart';
import { useState, useMemo } from 'react';

interface StrategyResultsProps {
  results: StrategyMetrics;
  data: BacktestData[];
}

interface Position {
  id: number;
  entryTime: string;
  exitTime: string;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  type: 'long' | 'short';
  pnl: number;
  duration: string;
  portfolioValue: number;
  portfolioValueAfter: number;
  buyConfidence: number;
}

const StrategyResults = ({ results, data }: StrategyResultsProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const positionsPerPage = 20;
  
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  // حساب قوة الثقة في الشراء
  const calculateBuyConfidence = (entryIndex: number): number => {
    if (entryIndex < 50 || entryIndex >= data.length) return 50;
    
    const currentData = data[entryIndex];
    const currentPrice = currentData.close;
    
    // حساب المؤشرات التقنية في وقت الدخول
    const closePrices = data.slice(0, entryIndex + 1).map(d => d.close);
    
    // RSI
    const calculateRSI = (prices: number[], period: number = 14): number => {
      if (prices.length < period + 1) return 50;
      
      const gains: number[] = [];
      const losses: number[] = [];
      
      for (let i = 1; i < prices.length; i++) {
        const change = prices[i] - prices[i - 1];
        gains.push(change > 0 ? change : 0);
        losses.push(change < 0 ? Math.abs(change) : 0);
      }
      
      const recentGains = gains.slice(-period);
      const recentLosses = losses.slice(-period);
      
      const avgGain = recentGains.reduce((a, b) => a + b, 0) / period;
      const avgLoss = recentLosses.reduce((a, b) => a + b, 0) / period;
      
      if (avgLoss === 0) return 100;
      const rs = avgGain / avgLoss;
      return 100 - (100 / (1 + rs));
    };
    
    // SMA
    const calculateSMA = (prices: number[], period: number): number => {
      if (prices.length < period) return prices[prices.length - 1];
      const recentPrices = prices.slice(-period);
      return recentPrices.reduce((a, b) => a + b, 0) / period;
    };
    
    // Bollinger Bands
    const calculateBollinger = (prices: number[], period: number = 20) => {
      if (prices.length < period) return { upper: currentPrice, lower: currentPrice, middle: currentPrice };
      
      const recentPrices = prices.slice(-period);
      const sma = recentPrices.reduce((a, b) => a + b, 0) / period;
      const variance = recentPrices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / period;
      const stdDev = Math.sqrt(variance);
      
      return {
        upper: sma + (stdDev * 2),
        lower: sma - (stdDev * 2),
        middle: sma
      };
    };
    
    const rsi = calculateRSI(closePrices);
    const sma20 = calculateSMA(closePrices, 20);
    const sma50 = calculateSMA(closePrices, 50);
    const bollinger = calculateBollinger(closePrices);
    
    let confidenceScore = 0;
    let maxScore = 0;
    
    // 1. RSI في منطقة ذروة البيع (كلما أقل كلما أفضل للشراء)
    maxScore += 25;
    if (rsi < 20) confidenceScore += 25;
    else if (rsi < 30) confidenceScore += 20;
    else if (rsi < 40) confidenceScore += 15;
    else if (rsi < 50) confidenceScore += 10;
    else if (rsi < 60) confidenceScore += 5;
    
    // 2. موضع السعر بالنسبة للمتوسطات المتحركة
    maxScore += 20;
    if (currentPrice < sma20 && sma20 > sma50) confidenceScore += 20; // سعر تحت SMA20 لكن الترند صاعد
    else if (currentPrice > sma20 && sma20 > sma50) confidenceScore += 15; // سعر فوق SMA20 والترند صاعد
    else if (currentPrice < sma20 && sma20 < sma50) confidenceScore += 10; // سعر تحت SMA20 والترند هابط
    else confidenceScore += 5;
    
    // 3. موضع السعر في نطاق بولينجر
    maxScore += 20;
    const bollingerPosition = (currentPrice - bollinger.lower) / (bollinger.upper - bollinger.lower);
    if (bollingerPosition < 0.2) confidenceScore += 20; // قريب من الحد السفلي
    else if (bollingerPosition < 0.4) confidenceScore += 15;
    else if (bollingerPosition < 0.6) confidenceScore += 10;
    else if (bollingerPosition < 0.8) confidenceScore += 5;
    
    // 4. انخفاض السعر الأخير (فرصة شراء)
    maxScore += 15;
    const priceChange5 = entryIndex >= 5 ? ((currentPrice - data[entryIndex - 5].close) / data[entryIndex - 5].close) * 100 : 0;
    if (priceChange5 < -10) confidenceScore += 15;
    else if (priceChange5 < -5) confidenceScore += 12;
    else if (priceChange5 < -2) confidenceScore += 8;
    else if (priceChange5 < 0) confidenceScore += 4;
    
    // 5. حجم التداول
    maxScore += 10;
    if (entryIndex >= 10) {
      const avgVolume = data.slice(entryIndex - 10, entryIndex).reduce((sum, d) => sum + d.volume, 0) / 10;
      const currentVolume = currentData.volume;
      if (currentVolume > avgVolume * 1.5) confidenceScore += 10;
      else if (currentVolume > avgVolume * 1.2) confidenceScore += 7;
      else if (currentVolume > avgVolume) confidenceScore += 4;
    }
    
    // 6. نمط الشموع
    maxScore += 10;
    const bodySize = Math.abs(currentData.close - currentData.open);
    const candleRange = currentData.high - currentData.low;
    const bodyPercentage = candleRange > 0 ? bodySize / candleRange : 0;
    
    if (currentData.close > currentData.open && bodyPercentage > 0.7) {
      confidenceScore += 10; // شمعة صاعدة قوية
    } else if (currentData.close > currentData.open && bodyPercentage > 0.5) {
      confidenceScore += 7;
    } else if (currentData.close > currentData.open) {
      confidenceScore += 4;
    }
    
    const finalConfidence = Math.round((confidenceScore / maxScore) * 100);
    return Math.min(100, Math.max(0, finalConfidence));
  };

  // الحصول على الإيموجي بناء على قوة الثقة
  const getConfidenceEmoji = (confidence: number): string => {
    if (confidence >= 90) return '🔥'; // نار - فرصة ممتازة
    if (confidence >= 80) return '💎'; // ألماس - فرصة قوية جداً
    if (confidence >= 70) return '⭐'; // نجمة - فرصة قوية
    if (confidence >= 60) return '👍'; // إبهام - فرصة جيدة
    if (confidence >= 50) return '👌'; // موافق - فرصة متوسطة
    if (confidence >= 40) return '⚠️'; // تحذير - فرصة ضعيفة
    if (confidence >= 30) return '😐'; // محايد - فرصة ضعيفة جداً
    return '❌'; // خطأ - فرصة سيئة
  };

  // استخدام قيم P&L المحسوبة مسبقاً من النظام
  const positions = useMemo(() => {
    const positionsList: Position[] = [];
    let currentPosition: any = null;
    let positionId = 1;

    results.trades.forEach((trade, index) => {
      if (trade.type === 'buy' && !currentPosition) {
        // بداية مركز طويل
        const entryIndex = data.findIndex(d => d.timestamp === trade.timestamp);
        currentPosition = {
          id: positionId++,
          entryTime: trade.timestamp,
          entryPrice: trade.price,
          quantity: trade.quantity,
          type: 'long' as const,
          entryEquityIndex: index,
          entryIndex: entryIndex,
        };
      } else if (trade.type === 'sell' && currentPosition) {
        // إغلاق مركز طويل - استخدام P&L المحسوبة من النظام
        const entryTime = new Date(currentPosition.entryTime);
        const exitTime = new Date(trade.timestamp);
        const duration = Math.round((exitTime.getTime() - entryTime.getTime()) / (1000 * 60 * 60)); // بالساعات
        
        // العثور على قيم المحفظة من منحنى رأس المال
        const entryEquityPoint = results.equityCurve.find(point => {
          const entryTimestamp = new Date(currentPosition.entryTime).getTime();
          const pointTimestamp = new Date(point.timestamp).getTime();
          return Math.abs(pointTimestamp - entryTimestamp) < 3600000;
        });
        
        const exitEquityPoint = results.equityCurve.find(point => {
          const exitTimestamp = new Date(trade.timestamp).getTime();
          const pointTimestamp = new Date(point.timestamp).getTime();
          return Math.abs(pointTimestamp - exitTimestamp) < 3600000;
        });
        
        const portfolioValueBefore = entryEquityPoint ? entryEquityPoint.equity : results.initialCapital;
        const portfolioValueAfter = exitEquityPoint ? exitEquityPoint.equity : results.initialCapital;
        
        // استخدام P&L من التداول مباشرة
        const actualPnl = trade.pnl || 0;
        
        // حساب قوة الثقة في الشراء
        const buyConfidence = calculateBuyConfidence(currentPosition.entryIndex || 0);
        
        positionsList.push({
          ...currentPosition,
          exitTime: trade.timestamp,
          exitPrice: trade.price,
          pnl: actualPnl,
          duration: duration > 24 ? `${Math.round(duration / 24)} أيام` : `${duration} ساعة`,
          portfolioValue: portfolioValueBefore,
          portfolioValueAfter: portfolioValueAfter,
          buyConfidence: buyConfidence,
        });
        
        currentPosition = null;
      }
    });

    return positionsList.reverse(); // عرض أحدث المراكز أولاً
  }, [results.trades, results.equityCurve, results.initialCapital, data]);

  // تحسين البيانات للرسوم البيانية - أخذ عينة كل 10 نقاط للبيانات الكبيرة
  const sampledData = useMemo(() => {
    if (data.length <= 1000) return data;
    const step = Math.ceil(data.length / 1000);
    return data.filter((_, index) => index % step === 0);
  }, [data]);

  // حساب قيمة المحفظة في وقت كل صفقة
  const getPortfolioValueAtTrade = (tradeIndex: number) => {
    const equityPoint = results.equityCurve.find((point, index) => {
      const tradeTimestamp = new Date(results.trades[tradeIndex].timestamp).getTime();
      const pointTimestamp = new Date(point.timestamp).getTime();
      return Math.abs(pointTimestamp - tradeTimestamp) < 3600000;
    });
    return equityPoint ? equityPoint.equity : results.initialCapital;
  };

  // تحضير البيانات مع التحسين
  const priceChartData = useMemo(() => {
    return sampledData.map((item, index) => ({
      timestamp: new Date(item.timestamp).toLocaleDateString('ar'),
      price: item.close,
      index
    }));
  }, [sampledData]);

  const equityChartData = useMemo(() => {
    return results.equityCurve.map((item, index) => ({
      timestamp: new Date(item.timestamp).toLocaleDateString('ar'),
      equity: item.equity,
      drawdown: -item.drawdown,
      index
    }));
  }, [results.equityCurve]);

  // تقسيم المراكز للصفحات
  const totalPages = Math.ceil(positions.length / positionsPerPage);
  const paginatedPositions = useMemo(() => {
    const startIndex = (currentPage - 1) * positionsPerPage;
    const endIndex = startIndex + positionsPerPage;
    return positions.slice(startIndex, endIndex);
  }, [positions, currentPage, positionsPerPage]);

  const MetricCard = ({ 
    title, 
    value, 
    description, 
    icon: Icon, 
    positive = true,
    format = 'currency' 
  }: {
    title: string;
    value: number;
    description: string;
    icon: any;
    positive?: boolean;
    format?: 'currency' | 'percentage' | 'number';
  }) => {
    const formattedValue = format === 'currency' ? formatCurrency(value) :
                          format === 'percentage' ? formatPercentage(value) :
                          value.toFixed(2);
    
    const colorClass = positive 
      ? value >= 0 ? 'text-green-400' : 'text-red-400'
      : value >= 0 ? 'text-red-400' : 'text-green-400';

    return (
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
            <Icon className="h-4 w-4 text-gray-400" />
          </div>
        </CardHeader>
        <CardContent>
          <div className={`text-2xl font-bold ${colorClass}`}>
            {formattedValue}
          </div>
          <p className="text-xs text-gray-400 mt-1">{description}</p>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-2">نتائج الاستراتيجية المحسنة</h2>
        <p className="text-gray-300">نظام إدارة المخاطر مع الشبكة والرافعة المالية 2x</p>
        <p className="text-sm text-gray-400 mt-1">
          تم تحليل {data.length.toLocaleString()} سجل • {positions.length} مركز
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <MetricCard
          title="العائد الإجمالي"
          value={results.totalReturn}
          description="مع نظام إدارة المخاطر"
          icon={TrendingUp}
          format="percentage"
        />
        <MetricCard
          title="العائد السنوي"
          value={results.annualizedReturn}
          description="العائد المحقق على أساس سنوي"
          icon={Target}
          format="percentage"
        />
        <MetricCard
          title="رأس المال النهائي"
          value={results.finalCapital}
          description={`من ${formatCurrency(results.initialCapital)}`}
          icon={DollarSign}
        />
        <MetricCard
          title="نسبة شارب"
          value={results.sharpeRatio}
          description="مقياس العائد المعدل بالمخاطر"
          icon={BarChart3}
          format="number"
        />
        <MetricCard
          title="أقصى انخفاض"
          value={results.maxDrawdown}
          description="أكبر انخفاض من القمة"
          icon={TrendingDown}
          positive={false}
          format="percentage"
        />
        <MetricCard
          title="معدل الربح"
          value={results.winRate}
          description={`من ${positions.length} مركز`}
          icon={Target}
          format="percentage"
        />
        <MetricCard
          title="عامل الربح"
          value={results.profitFactor}
          description="نسبة إجمالي الأرباح للخسائر"
          icon={Activity}
          format="number"
        />
        <MetricCard
          title="متوسط الربح"
          value={results.averageWin}
          description="متوسط ربح المراكز الرابحة"
          icon={TrendingUp}
        />
      </div>

      {/* Charts */}
      <Tabs defaultValue="candlestick" className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-white/10">
          <TabsTrigger value="candlestick" className="text-white data-[state=active]:bg-purple-500">
            الشموع اليابانية
          </TabsTrigger>
          <TabsTrigger value="equity" className="text-white data-[state=active]:bg-purple-500">
            منحنى رأس المال
          </TabsTrigger>
          <TabsTrigger value="price" className="text-white data-[state=active]:bg-purple-500">
            حركة السعر
          </TabsTrigger>
          <TabsTrigger value="positions" className="text-white data-[state=active]:bg-purple-500">
            تفاصيل المراكز
          </TabsTrigger>
        </TabsList>

        <TabsContent value="candlestick" className="space-y-4">
          <CandlestickChart data={sampledData} trades={results.trades} />
          {data.length > 1000 && (
            <div className="text-center text-sm text-yellow-400 bg-yellow-500/10 p-2 rounded">
              تم عرض عينة من البيانات ({sampledData.length} من {data.length}) لتحسين الأداء
            </div>
          )}
        </TabsContent>

        <TabsContent value="equity" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">منحنى رأس المال والانخفاض</CardTitle>
              <CardDescription className="text-gray-300">
                تطور قيمة المحفظة عبر الزمن مع نظام الشبكة
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={equityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#9CA3AF"
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: number, name: string) => [
                        name === 'equity' ? formatCurrency(value) : `${value.toFixed(2)}%`,
                        name === 'equity' ? 'رأس المال' : 'الانخفاض'
                      ]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="equity" 
                      stroke="#8B5CF6" 
                      strokeWidth={2}
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="drawdown" 
                      stroke="#EF4444" 
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="price" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">حركة سعر BTC/USDT</CardTitle>
              <CardDescription className="text-gray-300">
                تطور سعر البيتكوين خلال فترة الاختبار
                {data.length > 1000 && (
                  <span className="block text-yellow-400 text-sm mt-1">
                    عرض مبسط للبيانات الكبيرة ({sampledData.length} نقطة)
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-96">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={priceChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                    <XAxis 
                      dataKey="timestamp" 
                      stroke="#9CA3AF"
                      interval="preserveStartEnd"
                    />
                    <YAxis stroke="#9CA3AF" />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#1F2937', 
                        border: '1px solid #374151',
                        borderRadius: '8px',
                        color: '#F9FAFB'
                      }}
                      formatter={(value: number) => [formatCurrency(value), 'السعر']}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="price" 
                      stroke="#F59E0B" 
                      fill="url(#colorPrice)"
                      strokeWidth={2}
                    />
                    <defs>
                      <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#F59E0B" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#F59E0B" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="positions" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">سجل المراكز المفصل</CardTitle>
              <CardDescription className="text-gray-300">
                تفاصيل دقيقة لجميع المراكز ({positions.length} مركز) مع قوة الثقة في الشراء
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">
                    الصفحة {currentPage} من {totalPages} • عرض {positionsPerPage} مركز لكل صفحة
                  </span>
                </div>
              </CardDescription>
            </CardHeader>
            <CardContent>
              {/* أزرار التنقل */}
              <div className="flex justify-between items-center mb-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-white/10 border-white/20 text-white"
                >
                  <ChevronRight className="h-4 w-4 mr-1" />
                  السابق
                </Button>
                
                <span className="text-sm text-gray-300">
                  عرض المراكز {(currentPage - 1) * positionsPerPage + 1} - {Math.min(currentPage * positionsPerPage, positions.length)} من {positions.length}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-white/10 border-white/20 text-white"
                >
                  التالي
                  <ChevronLeft className="h-4 w-4 ml-1" />
                </Button>
              </div>

              <div className="space-y-3 max-h-96 overflow-y-auto">
                {paginatedPositions.map((position) => {
                  const leverage = 2;
                  const tradeValueUSDT = position.quantity * position.entryPrice;
                  const requiredCapital = tradeValueUSDT / leverage;
                  const portfolioPercentage = (requiredCapital / position.portfolioValue) * 100;
                  const pnlPercentage = (position.pnl / requiredCapital) * 100;
                  const confidenceEmoji = getConfidenceEmoji(position.buyConfidence);
                  
                  return (
                    <div 
                      key={position.id} 
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            position.type === 'long' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {position.type === 'long' ? '📈 شراء' : '📉 بيع قصير'}
                          </span>
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">
                            رافعة {leverage}x
                          </span>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">
                            #{position.id}
                          </span>
                          <span className="text-xs bg-gray-500/20 text-gray-400 px-2 py-1 rounded border border-gray-500/30">
                            {position.duration}
                          </span>
                        </div>
                        <div className={`text-right ${
                          position.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          <div className="text-sm font-bold">
                            {position.pnl >= 0 ? '+' : ''}{formatCurrency(position.pnl)}
                          </div>
                          <div className="text-xs">
                            {formatPercentage(pnlPercentage)}
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">سعر الدخول:</span>
                            <span className="text-white font-medium">{formatCurrency(position.entryPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">قوة الثقة في الشراء:</span>
                            <span className="text-yellow-400 font-medium flex items-center gap-1">
                              {confidenceEmoji} {position.buyConfidence}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">سعر الخروج:</span>
                            <span className="text-white font-medium">{formatCurrency(position.exitPrice)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">الكمية:</span>
                            <span className="text-white font-medium">{position.quantity.toFixed(6)} BTC</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">القيمة الإجمالية:</span>
                            <span className="text-white font-medium">{formatCurrency(tradeValueUSDT)}</span>
                          </div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">رأس المال المستخدم:</span>
                            <span className="text-purple-400 font-medium">{formatCurrency(requiredCapital)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">من المحفظة:</span>
                            <span className="text-purple-400 font-medium">{portfolioPercentage.toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">المحفظة قبل:</span>
                            <span className="text-gray-300 font-medium">{formatCurrency(position.portfolioValue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">المحفظة بعد:</span>
                            <span className="text-gray-300 font-medium">{formatCurrency(position.portfolioValueAfter)}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="flex justify-between">
                            <span className="text-gray-400">تاريخ الدخول:</span>
                            <span className="text-gray-300">{new Date(position.entryTime).toLocaleDateString('ar')}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">تاريخ الخروج:</span>
                            <span className="text-gray-300">{new Date(position.exitTime).toLocaleDateString('ar')}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* أزرار التنقل السفلية */}
              <div className="flex justify-center items-center gap-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="bg-white/10 border-white/20 text-white"
                >
                  الأولى
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="bg-white/10 border-white/20 text-white"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                
                <span className="mx-4 text-sm text-gray-300">
                  {currentPage} / {totalPages}
                </span>
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="bg-white/10 border-white/20 text-white"
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="bg-white/10 border-white/20 text-white"
                >
                  الأخيرة
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StrategyResults;
