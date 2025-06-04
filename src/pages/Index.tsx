
import { useState } from 'react';
import { Upload, TrendingUp, BarChart3, DollarSign } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import FileUploader from '@/components/FileUploader';
import StrategyResults from '@/components/StrategyResults';
import { BacktestData, StrategyMetrics } from '@/types/trading';
import { runBacktest, runSmartDCABacktest } from '@/utils/tradingStrategy';

const Index = () => {
  const [data, setData] = useState<BacktestData[]>([]);
  const [results, setResults] = useState<StrategyMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedStrategy, setSelectedStrategy] = useState<'strategy1' | 'strategy2'>('strategy1');

  const handleDataLoad = (csvData: BacktestData[]) => {
    setData(csvData);
    setResults(null);
  };

  const handleRunBacktest = async () => {
    if (data.length === 0) return;
    
    setLoading(true);
    try {
      let backtestResults: StrategyMetrics;
      
      if (selectedStrategy === 'strategy1') {
        backtestResults = runBacktest(data);
      } else {
        backtestResults = runSmartDCABacktest(data);
      }
      
      setResults(backtestResults);
    } catch (error) {
      console.error('Error running backtest:', error);
    }
    setLoading(false);
  };

  const getStrategyName = () => {
    return selectedStrategy === 'strategy1' ? 'Grid Strategy' : 'Smart DCA Strategy';
  };

  const getStrategyDescription = () => {
    return selectedStrategy === 'strategy1' 
      ? 'استراتيجية الشبكة مع التحليل الفني المتقدم'
      : 'استراتيجية الشراء الدوري الذكي مع تحليل ظروف السوق';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent mb-4">
            AI Quantitative Trading Strategies
          </h1>
          <p className="text-xl text-gray-300 max-w-2xl mx-auto">
            اختبر استراتيجيات التداول الكمية على بيانات BTC/USDT التاريخية واحصل على تحليل شامل للأداء
          </p>
        </div>

        {/* Strategy Selection & Upload Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <Card className="lg:col-span-2 bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Upload className="h-5 w-5" />
                رفع ملف البيانات
              </CardTitle>
              <CardDescription className="text-gray-300">
                ارفع ملف CSV يحتوي على بيانات BTC/USDT التاريخية
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUploader onDataLoad={handleDataLoad} />
              {data.length > 0 && (
                <div className="mt-4 p-4 bg-green-500/20 rounded-lg border border-green-500/30">
                  <p className="text-green-400 font-medium">
                    تم تحميل {data.length} سجل بنجاح
                  </p>
                  <p className="text-sm text-gray-300 mt-1">
                    من {new Date(data[0].timestamp).toLocaleDateString('ar')} 
                    إلى {new Date(data[data.length - 1].timestamp).toLocaleDateString('ar')}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                اختيار الاستراتيجية
              </CardTitle>
              <CardDescription className="text-gray-300">
                اختر استراتيجية التداول المناسبة
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Select 
                value={selectedStrategy} 
                onValueChange={(value: 'strategy1' | 'strategy2') => setSelectedStrategy(value)}
              >
                <SelectTrigger className="bg-white/10 border-white/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="strategy1">استراتيجية رقم 1 - Grid Strategy</SelectItem>
                  <SelectItem value="strategy2">استراتيجية رقم 2 - Smart DCA</SelectItem>
                </SelectContent>
              </Select>
              
              <div className="p-3 bg-blue-500/20 rounded-lg border border-blue-500/30">
                <p className="text-blue-400 font-medium text-sm">
                  {getStrategyName()}
                </p>
                <p className="text-gray-300 text-xs mt-1">
                  {getStrategyDescription()}
                </p>
              </div>
              
              <Button 
                onClick={handleRunBacktest}
                disabled={data.length === 0 || loading}
                className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                size="lg"
              >
                {loading ? 'جاري التحليل...' : 'ابدأ الاختبار'}
              </Button>
              
              {data.length === 0 && (
                <p className="text-sm text-gray-400 mt-2 text-center">
                  يجب رفع ملف البيانات أولاً
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Results Section */}
        {results && (
          <div className="mb-8">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-2">
                نتائج {getStrategyName()}
              </h2>
              <p className="text-gray-300">
                {getStrategyDescription()}
              </p>
            </div>
            <StrategyResults results={results} data={data} />
          </div>
        )}

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                  <BarChart3 className="h-6 w-6 text-blue-400" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">تحليل متقدم</CardTitle>
                  <CardDescription className="text-gray-400">
                    تحليل شامل للمخاطر والعوائد
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/20 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-green-400" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">استراتيجيات متعددة</CardTitle>
                  <CardDescription className="text-gray-400">
                    Grid Strategy و Smart DCA
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <Card className="bg-white/5 backdrop-blur-lg border-white/10">
            <CardHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/20 rounded-lg">
                  <DollarSign className="h-6 w-6 text-purple-400" />
                </div>
                <div>
                  <CardTitle className="text-white text-lg">نتائج دقيقة</CardTitle>
                  <CardDescription className="text-gray-400">
                    مقاييس أداء موثوقة
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
