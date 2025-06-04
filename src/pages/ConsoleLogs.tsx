
import { useState, useEffect } from 'react';
import { ArrowLeft, Activity, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';

interface DecisionLog {
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

const ConsoleLogs = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState<DecisionLog[]>([]);

  useEffect(() => {
    // محاكاة بيانات القرارات
    const mockLogs: DecisionLog[] = [
      {
        timestamp: '2024-01-15 14:30:25',
        action: 'buy',
        price: 42850.50,
        marketTrend: 'bearish',
        indicators: {
          rsi: 32.5,
          sma20: 43200,
          sma50: 43800,
          macdLine: -125.8,
          macdSignal: -145.2,
          bollingerLower: 42800,
          bollingerUpper: 44200
        },
        signals: {
          rsiSignal: 'RSI < 35: إشارة شراء قوية (+2 نقاط)',
          smaSignal: 'SMA20 < SMA50: لا توجد إشارة (0 نقاط)',
          macdSignal: 'MACD > Signal: إشارة شراء (+2 نقاط)',
          bollingerSignal: 'السعر قريب من الحد السفلي (+2 نقاط)',
          priceDropSignal: 'انخفاض 4.2% في آخر 5 شموع (+1 نقطة)',
          volumeSignal: 'حجم تداول مرتفع 1.8x من المتوسط (+1 نقطة)'
        },
        buyScore: 8,
        finalDecision: 'شراء - نقاط الشراء: 8/10',
        reason: 'RSI في منطقة ذروة البيع + إشارة MACD إيجابية + السعر قريب من خط بولينجر السفلي'
      },
      {
        timestamp: '2024-01-15 15:45:12',
        action: 'hold',
        price: 43120.75,
        marketTrend: 'bullish',
        indicators: {
          rsi: 55.2,
          sma20: 43180,
          sma50: 43750,
          macdLine: -85.3,
          macdSignal: -95.1,
          bollingerLower: 42900,
          bollingerUpper: 44300
        },
        signals: {
          rsiSignal: 'RSI = 55.2: منطقة متوسطة (+1 نقطة)',
          smaSignal: 'SMA20 < SMA50: لا توجد إشارة (0 نقاط)',
          macdSignal: 'MACD > Signal: إشارة شراء (+2 نقاط)',
          bollingerSignal: 'السعر في المنتصف (0 نقاط)',
          priceDropSignal: 'لا يوجد انخفاض كبير (0 نقاط)',
          volumeSignal: 'حجم تداول عادي (0 نقاط)'
        },
        buyScore: 3,
        finalDecision: 'انتظار - نقاط الشراء: 3/10',
        reason: 'نقاط الشراء غير كافية للدخول - نحتاج 4 نقاط على الأقل'
      },
      {
        timestamp: '2024-01-15 16:20:45',
        action: 'sell',
        price: 44680.25,
        marketTrend: 'bullish',
        indicators: {
          rsi: 68.5,
          sma20: 43850,
          sma50: 43720,
          macdLine: 95.2,
          macdSignal: 88.7,
          bollingerLower: 43200,
          bollingerUpper: 44800
        },
        signals: {
          rsiSignal: 'RSI = 68.5: منطقة مرتفعة، لا شراء (0 نقاط)',
          smaSignal: 'SMA20 > SMA50: اتجاه صاعد (+1 نقطة)',
          macdSignal: 'MACD > Signal: إشارة إيجابية (+2 نقاط)',
          bollingerSignal: 'السعر قريب من الحد العلوي (0 نقاط)',
          priceDropSignal: 'ارتفاع 3.8% من نقطة الشراء',
          volumeSignal: 'حجم تداول عادي (0 نقاط)'
        },
        buyScore: 0,
        finalDecision: 'بيع - تحقيق ربح 15.2%',
        reason: 'وصول لهدف الربح في السوق الصاعد (15%) - بيع لتأمين المكاسب'
      }
    ];

    setLogs(mockLogs);
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
              تفاصيل كيفية اتخاذ قرارات الشراء والبيع بناءً على المؤشرات الفنية
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
                      ${log.price.toLocaleString()}
                    </CardTitle>
                    <Badge variant="outline" className="text-gray-300 border-gray-600">
                      {log.marketTrend === 'bullish' ? 'سوق صاعد' : 'سوق هابط'}
                    </Badge>
                  </div>
                  <CardDescription className="text-gray-400">
                    {log.timestamp}
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
                      <div className="text-white font-mono">{log.indicators.rsi}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">SMA20</div>
                      <div className="text-white font-mono">${log.indicators.sma20.toLocaleString()}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">SMA50</div>
                      <div className="text-white font-mono">${log.indicators.sma50.toLocaleString()}</div>
                    </div>
                    <div className="bg-black/20 p-3 rounded-lg">
                      <div className="text-gray-400 text-sm">MACD</div>
                      <div className="text-white font-mono">{log.indicators.macdLine.toFixed(1)}</div>
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
                  <li>• كسر SMA20 فوق SMA50: +3 نقاط (اتجاه صاعد)</li>
                  <li>• MACD فوق خط الإشارة: +2 نقاط (قوة شرائية)</li>
                  <li>• السعر قريب من خط بولينجر السفلي: +2 نقاط (دعم قوي)</li>
                  <li>• انخفاض حاد في السعر: +1-2 نقاط (فرصة شراء)</li>
                  <li>• حجم تداول مرتفع: +1 نقطة (تأكيد الإشارة)</li>
                  <li className="font-semibold text-yellow-400">• يتم الشراء عند الحصول على 4+ نقاط</li>
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
