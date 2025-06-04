import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { CandlestickChart } from '@/components/CandlestickChart';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { Table, TableBody, TableCaption, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BacktestData, StrategyMetrics, Trade } from '@/types/trading';
import { ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';
import { format } from 'date-fns';
import { useMemo } from 'react';
import FibonacciPivotTable from './FibonacciPivotTable';

interface StrategyResultsProps {
  results: StrategyMetrics;
  data: BacktestData[];
}

const StrategyResults = ({ results, data }: StrategyResultsProps) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value / 100);
  };

  const formatDate = (dateString: string) => {
    try {
      return format(new Date(dateString), 'MMM dd, yyyy HH:mm');
    } catch (error) {
      console.error("Error formatting date:", error);
      return 'Invalid Date';
    }
  };

  const chartData = useMemo(() => {
    return data.map(item => ({
      timestamp: new Date(item.timestamp).toLocaleDateString('ar'),
      equity: results.equityCurve.find(eq => eq.timestamp === item.timestamp)?.equity || 0,
    }));
  }, [data, results.equityCurve]);

  return (
    <div className="space-y-8">
      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              📈 العائد الكلي
            </CardTitle>
            <CardDescription className="text-gray-300">
              إجمالي الربح أو الخسارة كنسبة مئوية
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-400">
              {formatPercentage(results.totalReturn)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              📊 نسبة الفوز
            </CardTitle>
            <CardDescription className="text-gray-300">
              نسبة الصفقات الرابحة إلى إجمالي الصفقات
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-400">
              {formatPercentage(results.winRate)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              💰 رأس المال النهائي
            </CardTitle>
            <CardDescription className="text-gray-300">
              إجمالي رأس المال بعد الاختبار
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-yellow-400">
              {formatCurrency(results.finalCapital)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white flex items-center gap-2">
              📉 أكبر تراجع
            </CardTitle>
            <CardDescription className="text-gray-300">
              أكبر خسارة من الذروة إلى القاع
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-400">
              {formatPercentage(results.maxDrawdown)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        <CandlestickChart data={data} trades={results.trades} />
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">منحنى رأس المال</CardTitle>
            <CardDescription className="text-gray-300">تطور رأس المال مع مرور الوقت</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ equity: { label: "Equity", color: "#3B82F6" } }} className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="timestamp" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" tickFormatter={formatCurrency} />
                  <ChartTooltip
                    content={({ active, payload, label }) => {
                      if (!active || !payload?.length) return null;
                      const data = payload[0]?.payload;
                      if (!data) return null;
                      return (
                        <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-white">
                          <p className="font-medium mb-2">{label}</p>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between gap-4">
                              <span>رأس المال:</span>
                              <span className="font-medium">{formatCurrency(data.equity)}</span>
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="equity"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={false}
                    connectNulls={true}
                    isAnimationActive={false}
                  />
                </ComposedChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Fibonacci Pivot Table */}
      <FibonacciPivotTable data={data} />

      {/* Detailed Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">مقاييس المخاطر</CardTitle>
            <CardDescription className="text-gray-300">تحليل مفصل للمخاطر</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    أقصى تراجع:
                  </TableCell>
                  <TableCell className="text-red-400">
                    {formatPercentage(results.maxDrawdown)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    نسبة شارب:
                  </TableCell>
                  <TableCell className="text-blue-400">
                    {results.sharpeRatio.toFixed(2)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    معامل الربح:
                  </TableCell>
                  <TableCell className="text-green-400">
                    {results.profitFactor.toFixed(2)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card className="bg-white/10 backdrop-blur-lg border-white/20">
          <CardHeader>
            <CardTitle className="text-white">تحليل الصفقات</CardTitle>
            <CardDescription className="text-gray-300">نظرة عامة على أداء الصفقات</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    إجمالي الصفقات:
                  </TableCell>
                  <TableCell className="text-gray-400">
                    {results.totalTrades}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    الصفقات الرابحة:
                  </TableCell>
                  <TableCell className="text-green-400">
                    {results.winningTrades}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    الصفقات الخاسرة:
                  </TableCell>
                  <TableCell className="text-red-400">
                    {results.losingTrades}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    متوسط الربح:
                  </TableCell>
                  <TableCell className="text-green-400">
                    {formatCurrency(results.averageWin)}
                  </TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium text-gray-300">
                    متوسط الخسارة:
                  </TableCell>
                  <TableCell className="text-red-400">
                    {formatCurrency(results.averageLoss)}
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* Trades Table */}
      <Card className="bg-white/10 backdrop-blur-lg border-white/20">
        <CardHeader>
          <CardTitle className="text-white">سجل التداولات</CardTitle>
          <CardDescription className="text-gray-300">جميع الصفقات التي تم تنفيذها</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-gray-300">التاريخ</TableHead>
                  <TableHead className="text-gray-300">النوع</TableHead>
                  <TableHead className="text-gray-300">السعر</TableHead>
                  <TableHead className="text-gray-300">الكمية</TableHead>
                  <TableHead className="text-gray-300">الربح/الخسارة</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {results.trades.map((trade, index) => (
                  <TableRow key={index}>
                    <TableCell className="text-gray-400">{formatDate(trade.timestamp)}</TableCell>
                    <TableCell className={trade.type === 'buy' ? 'text-green-400' : 'text-red-400'}>
                      {trade.type === 'buy' ? 'شراء' : 'بيع'}
                    </TableCell>
                    <TableCell className="text-gray-400">{formatCurrency(trade.price)}</TableCell>
                    <TableCell className="text-gray-400">{trade.quantity.toFixed(2)}</TableCell>
                    <TableCell className={trade.pnl && trade.pnl > 0 ? 'text-green-400' : 'text-red-400'}>
                      {trade.pnl ? formatCurrency(trade.pnl) : '-'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default StrategyResults;
