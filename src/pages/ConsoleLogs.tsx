
import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { DecisionLog } from '@/types/trading';

const ConsoleLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<DecisionLog[]>([]);

  useEffect(() => {
    // محاولة الحصول على البيانات من localStorage
    const savedResults = localStorage.getItem('tradingResults');
    if (savedResults) {
      try {
        const results = JSON.parse(savedResults);
        if (results.decisionLogs && results.decisionLogs.length > 0) {
          // أخذ آخر 50 قرار فقط لتحسين الأداء
          setLogs(results.decisionLogs.slice(-50).reverse());
        }
      } catch (error) {
        console.error('Error parsing trading results:', error);
      }
    }
  }, []);

  const getActionColor = (action: string) => {
    switch (action) {
      case 'buy': return 'text-green-400 bg-green-500/20';
      case 'sell': return 'text-red-400 bg-red-500/20';
      case 'hold': return 'text-yellow-400 bg-yellow-500/20';
      default: return 'text-gray-400 bg-gray-500/20';
    }
  };

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'buy': return <TrendingUp className="h-4 w-4" />;
      case 'sell': return <TrendingDown className="h-4 w-4" />;
      case 'hold': return <Eye className="h-4 w-4" />;
      default: return <Activity className="h-4 w-4" />;
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (logs.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center gap-4 mb-8">
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              العودة
            </Button>
            <div>
              <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Console.log - تتبع القرارات
              </h1>
              <p className="text-gray-300 mt-2">
                تفاصيل كيفية اتخاذ قرارات الشراء والبيع بناءً على المؤشرات الفنية
              </p>
            </div>
          </div>

          <Card className="bg-white/10 backdrop-blur-lg border-white/20">
            <CardContent className="pt-6">
              <div className="text-center">
                <Activity className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">لا توجد بيانات متاحة</h3>
                <p className="text-gray-300 mb-4">
                  يجب تشغيل اختبار الاستراتيجية أولاً لرؤية تفاصيل اتخاذ القرارات
                </p>
                <Button 
                  onClick={() => navigate('/')}
                  className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
                >
                  ارجع لتشغيل الاختبار
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/')}
            className="text-white hover:bg-white/10"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            العودة
          </Button>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              Console.log - تتبع القرارات
            </h1>
            <p className="text-gray-300 mt-2">
              تفاصيل كيفية اتخاذ قرارات الشراء والبيع بناءً على المؤشرات الفنية الحقيقية
            </p>
            <p className="text-gray-400 text-sm mt-1">
              عرض آخر {logs.length} قرار من الاختبار الأخير
            </p>
          </div>
        </div>

        {/* Decision Logs */}
        <div className="space-y-6">
          {logs.map((log, index) => (
            <Card key={index} className="bg-white/10 backdrop-blur-lg border-white/20">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Badge className={`${getActionColor(log.action)} border-0`}>
                      {getActionIcon(log.action)}
                      <span className="mr-2">
                        {log.action === 'buy' ? 'شراء' : log.action === 'sell' ? 'بيع' : 'انتظار'}
                      </span>
                    </Badge>
                    <CardTitle className="text-white">
                      {formatCurrency(log.price)}
                    </CardTitle>
                    <Badge variant="outline" className="text-gray-300 border-gray-600">
                      {log.marketTrend === 'bullish' ? 'سوق صاعد' : 'سوق هابط'}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-400">
                    {new Date(log.timestamp).toLocaleDateString('ar')} - {new Date(log.timestamp).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                  </CardDescription>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {/* المؤشرات الفنية */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">📊 المؤشرات الفنية</h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">RSI</div>
                      <div className="text-white font-mono">{log.indicators.rsi.toFixed(1)}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">SMA20</div>
                      <div className="text-white font-mono">{formatCurrency(log.indicators.sma20)}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">SMA50</div>
                      <div className="text-white font-mono">{formatCurrency(log.indicators.sma50)}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">MACD</div>
                      <div className="text-white font-mono">{log.indicators.macdLine.toFixed(1)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">Bollinger Lower</div>
                      <div className="text-white font-mono">{formatCurrency(log.indicators.bollingerLower)}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">Bollinger Upper</div>
                      <div className="text-white font-mono">{formatCurrency(log.indicators.bollingerUpper)}</div>
                    </div>
                  </div>
                </div>

                {/* تحليل الإشارات */}
                <div>
                  <h3 className="text-lg font-semibold text-white mb-3">🔍 تحليل الإشارات</h3>
                  <div className="space-y-2">
                    {Object.entries(log.signals).map(([key, signal]) => (
                      <div key={key} className="bg-black/20 p-3 rounded-lg">
                        <div className="text-gray-300 font-mono text-sm">{signal}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* القرار النهائي */}
                <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 p-4 rounded-lg border border-purple-500/30">
                  <h3 className="text-lg font-semibold text-white mb-2">🎯 القرار النهائي</h3>
                  <div className="text-lg text-white font-semibold mb-2">{log.finalDecision}</div>
                  <div className="text-gray-300">{log.reason}</div>
                  {log.action !== 'sell' && (
                    <div className="mt-2 text-sm text-gray-400">
                      نقاط الشراء المطلوبة: 4+ | نقاط الشراء الحالية: {log.buyScore}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* ملاحظة */}
        <Card className="mt-8 bg-blue-500/10 border-blue-500/30">
          <CardContent className="pt-6">
            <div className="flex items-start gap-3">
              <Activity className="h-5 w-5 text-blue-400 mt-1" />
              <div>
                <h3 className="text-white font-semibold mb-2">كيف تعمل خوارزمية اتخاذ القرار؟</h3>
                <ul className="text-gray-300 space-y-1 text-sm">
                  <li>• RSI أقل من 35: +2 نقاط (منطقة ذروة البيع)</li>
                  <li>• RSI أقل من 45: +1 نقطة (منطقة شراء متوسطة)</li>
                  <li>• كسر SMA20 فوق SMA50: +3 نقاط (اتجاه صاعد جديد)</li>
                  <li>• SMA20 أكبر من SMA50: +1 نقطة (اتجاه صاعد)</li>
                  <li>• MACD فوق خط الإشارة: +2 نقاط (قوة شرائية)</li>
                  <li>• السعر قريب من خط بولينجر السفلي: +2 نقاط (دعم قوي)</li>
                  <li>• انخفاض حاد في السعر (>5%): +2 نقاط (فرصة شراء)</li>
                  <li>• انخفاض متوسط في السعر (>3%): +1 نقطة</li>
                  <li>• حجم تداول مرتفع (>1.5x): +1 نقطة (تأكيد الإشارة)</li>
                  <li className="font-semibold text-yellow-400">• يتم الشراء عند الحصول على 4+ نقاط</li>
                  <li className="font-semibold text-red-400">• يتم البيع عند تحقيق 15% ربح (سوق صاعد) أو 8% (سوق هابط)</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ConsoleLogs;
