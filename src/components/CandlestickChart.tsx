
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BacktestData, Trade } from '@/types/trading';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';
import { ComposedChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Scatter, Cell } from 'recharts';

interface CandlestickChartProps {
  data: BacktestData[];
  trades: Trade[];
}

const CandlestickChart = ({ data, trades }: CandlestickChartProps) => {
  // تحضير البيانات للرسم البياني
  const chartData = data.map((candle, index) => {
    const buyTrade = trades.find(trade => 
      trade.type === 'buy' && 
      Math.abs(new Date(trade.timestamp).getTime() - new Date(candle.timestamp).getTime()) < 3600000
    );
    
    const sellTrade = trades.find(trade => 
      trade.type === 'sell' && 
      Math.abs(new Date(trade.timestamp).getTime() - new Date(candle.timestamp).getTime()) < 3600000
    );

    return {
      timestamp: new Date(candle.timestamp).toLocaleDateString('ar'),
      open: candle.open,
      high: candle.high,
      low: candle.low,
      close: candle.close,
      volume: candle.volume,
      buySignal: buyTrade ? candle.low - 100 : null,
      sellSignal: sellTrade ? candle.high + 100 : null,
      buyPrice: buyTrade?.price || null,
      sellPrice: sellTrade?.price || null,
      index
    };
  });

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const chartConfig = {
    price: {
      label: "السعر",
      color: "#8B5CF6",
    },
    buy: {
      label: "شراء",
      color: "#10B981",
    },
    sell: {
      label: "بيع",
      color: "#EF4444",
    },
  };

  // مكون مخصص لرسم الشموع
  const CustomCandlestick = (props: any) => {
    const { payload, x, y, width, height } = props;
    
    if (!payload) return null;
    
    const { open, high, low, close } = payload;
    const isGreen = close > open;
    
    // حساب المواضع
    const centerX = x + width / 2;
    const bodyTop = Math.min(open, close);
    const bodyBottom = Math.max(open, close);
    const bodyHeight = Math.abs(close - open);
    
    // تحويل الأسعار إلى مواضع على الشاشة
    const yScale = height / (Math.max(...chartData.map(d => d.high)) - Math.min(...chartData.map(d => d.low)));
    const minPrice = Math.min(...chartData.map(d => d.low));
    
    const highY = y + height - (high - minPrice) * yScale;
    const lowY = y + height - (low - minPrice) * yScale;
    const bodyTopY = y + height - (bodyTop - minPrice) * yScale;
    const bodyBottomY = y + height - (bodyBottom - minPrice) * yScale;
    
    return (
      <g>
        {/* الفتيل العلوي */}
        <line
          x1={centerX}
          y1={highY}
          x2={centerX}
          y2={bodyTopY}
          stroke={isGreen ? '#10B981' : '#EF4444'}
          strokeWidth={1}
        />
        {/* الفتيل السفلي */}
        <line
          x1={centerX}
          y1={bodyBottomY}
          x2={centerX}
          y2={lowY}
          stroke={isGreen ? '#10B981' : '#EF4444'}
          strokeWidth={1}
        />
        {/* جسم الشمعة */}
        <rect
          x={centerX - width * 0.3}
          y={bodyTopY}
          width={width * 0.6}
          height={Math.max(bodyHeight * yScale, 2)}
          fill={isGreen ? '#10B981' : '#EF4444'}
          stroke={isGreen ? '#059669' : '#DC2626'}
          strokeWidth={1}
        />
      </g>
    );
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white">الرسم البياني بالشموع اليابانية مع إشارات التداول</CardTitle>
      </CardHeader>
      <CardContent>
        <ChartContainer config={chartConfig} className="h-[600px] w-full">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart 
              data={chartData} 
              margin={{ top: 20, right: 30, left: 60, bottom: 60 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="timestamp" 
                stroke="#9CA3AF"
                tick={{ fontSize: 10 }}
                angle={-45}
                textAnchor="end"
                height={80}
                interval={Math.floor(chartData.length / 10)}
              />
              <YAxis 
                stroke="#9CA3AF"
                tickFormatter={formatCurrency}
                domain={['dataMin - 500', 'dataMax + 500']}
                width={80}
              />
              
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
                          <span>فتح:</span>
                          <span className="font-medium">{formatCurrency(data.open)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>أعلى:</span>
                          <span className="font-medium">{formatCurrency(data.high)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>أدنى:</span>
                          <span className="font-medium">{formatCurrency(data.low)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>إغلاق:</span>
                          <span className="font-medium">{formatCurrency(data.close)}</span>
                        </div>
                        <div className="flex justify-between gap-4">
                          <span>الحجم:</span>
                          <span className="font-medium">{data.volume.toFixed(2)}</span>
                        </div>
                        {data.buyPrice && (
                          <div className="flex justify-between gap-4 text-green-400">
                            <span>🟢 شراء:</span>
                            <span className="font-medium">{formatCurrency(data.buyPrice)}</span>
                          </div>
                        )}
                        {data.sellPrice && (
                          <div className="flex justify-between gap-4 text-red-400">
                            <span>🔴 بيع:</span>
                            <span className="font-medium">{formatCurrency(data.sellPrice)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                }}
              />
              
              {/* رسم الشموع اليابانية */}
              <Scatter
                dataKey="close"
                shape={<CustomCandlestick />}
                fill="transparent"
              />
              
              {/* إشارات الشراء */}
              <Scatter
                dataKey="buySignal"
                fill="#10B981"
                shape={(props: any) => {
                  if (!props.payload.buySignal) return null;
                  return (
                    <g>
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={8}
                        fill="#10B981"
                        stroke="#065F46"
                        strokeWidth={2}
                      />
                      <text
                        x={props.cx}
                        y={props.cy + 3}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        B
                      </text>
                    </g>
                  );
                }}
              />
              
              {/* إشارات البيع */}
              <Scatter
                dataKey="sellSignal"
                fill="#EF4444"
                shape={(props: any) => {
                  if (!props.payload.sellSignal) return null;
                  return (
                    <g>
                      <circle
                        cx={props.cx}
                        cy={props.cy}
                        r={8}
                        fill="#EF4444"
                        stroke="#7F1D1D"
                        strokeWidth={2}
                      />
                      <text
                        x={props.cx}
                        y={props.cy + 3}
                        textAnchor="middle"
                        fill="white"
                        fontSize="12"
                        fontWeight="bold"
                      >
                        S
                      </text>
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </ChartContainer>
        
        <div className="mt-4 flex justify-center gap-6 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">B</span>
            </div>
            <span className="text-gray-300">إشارة شراء</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">S</span>
            </div>
            <span className="text-gray-300">إشارة بيع</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-green-500"></div>
            <span className="text-gray-300">شمعة صاعدة</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-3 bg-red-500"></div>
            <span className="text-gray-300">شمعة هابطة</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default CandlestickChart;
