
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

const StrategyResults = ({ results, data }: StrategyResultsProps) => {
  const [currentPage, setCurrentPage] = useState(1);
  const tradesPerPage = 20;
  
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

  // تقسيم الصفقات للصفحات
  const totalPages = Math.ceil(results.trades.length / tradesPerPage);
  const paginatedTrades = useMemo(() => {
    const reversedTrades = [...results.trades].reverse();
    const startIndex = (currentPage - 1) * tradesPerPage;
    const endIndex = startIndex + tradesPerPage;
    return reversedTrades.slice(startIndex, endIndex).map((trade, reverseIndex) => {
      const actualIndex = results.trades.length - 1 - (startIndex + reverseIndex);
      return { trade, actualIndex };
    });
  }, [results.trades, currentPage, tradesPerPage]);

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
          تم تحليل {data.length.toLocaleString()} سجل • {results.trades.length} صفقة
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
          description={`من ${results.totalTrades} صفقة`}
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
          description="متوسط ربح الصفقات الرابحة"
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
          <TabsTrigger value="trades" className="text-white data-[state=active]:bg-purple-500">
            تفاصيل الصفقات
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

        <TabsContent value="trades" className="space-y-4">
          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white">سجل الصفقات المفصل</CardTitle>
              <CardDescription className="text-gray-300">
                تفاصيل دقيقة لجميع الصفقات ({results.trades.length} صفقة) مع قيم USDT ونسبة المحفظة والرافعة المالية
                <div className="flex items-center justify-between mt-2">
                  <span className="text-sm">
                    الصفحة {currentPage} من {totalPages} • عرض {tradesPerPage} صفقة لكل صفحة
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
                  عرض الصفقات {(currentPage - 1) * tradesPerPage + 1} - {Math.min(currentPage * tradesPerPage, results.trades.length)} من {results.trades.length}
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
                {paginatedTrades.map(({ trade, actualIndex }) => {
                  const portfolioValue = getPortfolioValueAtTrade(actualIndex);
                  const tradeValueUSDT = trade.quantity * trade.price;
                  const portfolioPercentage = (tradeValueUSDT / portfolioValue) * 100;
                  const leverage = 2;
                  const requiredCapital = tradeValueUSDT / leverage;
                  
                  return (
                    <div 
                      key={actualIndex} 
                      className="bg-white/5 rounded-lg p-4 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-3">
                          <span className={`text-sm font-bold px-3 py-1 rounded-full ${
                            trade.type === 'buy' 
                              ? 'bg-green-500/20 text-green-400 border border-green-500/30' 
                              : 'bg-red-500/20 text-red-400 border border-red-500/30'
                          }`}>
                            {trade.type === 'buy' ? '🟢 شراء' : '🔴 بيع'}
                          </span>
                          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded border border-purple-500/30">
                            رافعة {leverage}x
                          </span>
                          <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded border border-blue-500/30">
                            #{actualIndex + 1}
                          </span>
                          <div className="text-xs text-gray-400">
                            {new Date(trade.timestamp).toLocaleDateString('ar')} - {new Date(trade.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        {trade.pnl && (
                          <div className={`text-right ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            <div className="text-sm font-bold">
                              {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                            </div>
                            <div className="text-xs">
                              {formatPercentage((trade.pnl / portfolioValue) * 100)}
                            </div>
                          </div>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <span className="text-gray-400">السعر:</span>
                            <span className="text-white font-medium">{formatCurrency(trade.price)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">الكمية:</span>
                            <span className="text-white font-medium">{trade.quantity.toFixed(6)} BTC</span>
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
                            <span className="text-gray-400">الرافعة المالية:</span>
                            <span className="text-orange-400 font-medium">{leverage}x</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-white/10">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-400">قيمة المحفظة:</span>
                          <span className="text-gray-300">{formatCurrency(portfolioValue)}</span>
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
