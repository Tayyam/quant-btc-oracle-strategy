
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, DollarSign, Target, BarChart3, Activity } from 'lucide-react';
import { StrategyMetrics, BacktestData } from '@/types/trading';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import CandlestickChart from './CandlestickChart';

interface StrategyResultsProps {
  results: StrategyMetrics;
  data: BacktestData[];
}

const StrategyResults = ({ results, data }: StrategyResultsProps) => {
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

  const priceChartData = data.map((item, index) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString('ar'),
    price: item.close,
    index
  }));

  const equityChartData = results.equityCurve.map((item, index) => ({
    timestamp: new Date(item.timestamp).toLocaleDateString('ar'),
    equity: item.equity,
    drawdown: -item.drawdown,
    index
  }));

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
          <CandlestickChart data={data} trades={results.trades} />
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">إحصائيات الصفقات المحسنة</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">إجمالي الصفقات</span>
                  <span className="text-white font-semibold">{results.totalTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">الصفقات الرابحة</span>
                  <span className="text-green-400 font-semibold">{results.winningTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">الصفقات الخاسرة</span>
                  <span className="text-red-400 font-semibold">{results.losingTrades}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">متوسط الربح</span>
                  <span className="text-green-400 font-semibold">{formatCurrency(results.averageWin)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">متوسط الخسارة</span>
                  <span className="text-red-400 font-semibold">{formatCurrency(results.averageLoss)}</span>
                </div>
                <div className="border-t border-gray-600 pt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-300">نظام الإدارة</span>
                    <span className="text-purple-400 font-semibold">شبكة 8 مستويات</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">الرافعة المالية</span>
                    <span className="text-purple-400 font-semibold">2x</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-300">حماية التصفية</span>
                    <span className="text-green-400 font-semibold">30,000 USD</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <CardTitle className="text-white">سجل الصفقات المفصل</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {results.trades.slice(-15).reverse().map((trade, index) => (
                    <div 
                      key={index} 
                      className="flex justify-between items-center p-3 bg-white/5 rounded border-l-4 border-l-purple-500"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`text-sm font-medium px-2 py-1 rounded ${
                            trade.type === 'buy' 
                              ? 'bg-green-500/20 text-green-400' 
                              : 'bg-red-500/20 text-red-400'
                          }`}>
                            {trade.type === 'buy' ? '🟢 شراء' : '🔴 بيع'}
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {new Date(trade.timestamp).toLocaleDateString('ar')} - {new Date(trade.timestamp).toLocaleTimeString('ar')}
                        </div>
                        <div className="text-xs text-gray-300 mt-1">
                          الكمية: {trade.quantity.toFixed(6)} BTC
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm text-white font-medium">
                          {formatCurrency(trade.price)}
                        </div>
                        {trade.pnl && (
                          <div className={`text-sm font-medium ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {trade.pnl >= 0 ? '+' : ''}{formatCurrency(trade.pnl)}
                          </div>
                        )}
                        {trade.pnl && (
                          <div className={`text-xs ${
                            trade.pnl >= 0 ? 'text-green-400' : 'text-red-400'
                          }`}>
                            {formatPercentage((trade.pnl / results.initialCapital) * 100)}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StrategyResults;
