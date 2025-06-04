
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BacktestData } from '@/types/trading';

interface FibonacciPivotTableProps {
  data: BacktestData[];
}

interface PivotLevels {
  pivot: number;
  resistance1: number;
  resistance2: number;
  resistance3: number;
  support1: number;
  support2: number;
  support3: number;
  period: string;
}

const FibonacciPivotTable = ({ data }: FibonacciPivotTableProps) => {
  const calculateFibonacciPivots = (): PivotLevels[] => {
    if (data.length === 0) return [];

    const pivots: PivotLevels[] = [];
    const chunkSize = Math.floor(data.length / 10); // تقسيم البيانات إلى 10 فترات
    
    for (let i = 0; i < data.length; i += chunkSize) {
      const chunk = data.slice(i, i + chunkSize);
      if (chunk.length === 0) continue;

      const high = Math.max(...chunk.map(d => d.high));
      const low = Math.min(...chunk.map(d => d.low));
      const close = chunk[chunk.length - 1].close;

      // حساب البيفوت الأساسي
      const pivot = (high + low + close) / 3;

      // حساب مستويات فيبوناتشي
      const range = high - low;
      const fib236 = range * 0.236;
      const fib382 = range * 0.382;
      const fib618 = range * 0.618;

      // مستويات المقاومة
      const resistance1 = pivot + fib236;
      const resistance2 = pivot + fib382;
      const resistance3 = pivot + fib618;

      // مستويات الدعم
      const support1 = pivot - fib236;
      const support2 = pivot - fib382;
      const support3 = pivot - fib618;

      const startDate = new Date(chunk[0].timestamp).toLocaleDateString('ar-SA');
      const endDate = new Date(chunk[chunk.length - 1].timestamp).toLocaleDateString('ar-SA');

      pivots.push({
        pivot,
        resistance1,
        resistance2,
        resistance3,
        support1,
        support2,
        support3,
        period: `${startDate} - ${endDate}`
      });
    }

    return pivots;
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const pivotLevels = calculateFibonacciPivots();

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'resistance':
        return 'text-red-400';
      case 'support':
        return 'text-green-400';
      case 'pivot':
        return 'text-blue-400';
      default:
        return 'text-gray-300';
    }
  };

  return (
    <Card className="bg-white/10 backdrop-blur-lg border-white/20">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          📊 مستويات فيبوناتشي بيفوت
        </CardTitle>
        <p className="text-sm text-gray-300">
          مستويات الدعم والمقاومة المحسوبة باستخدام نسب فيبوناتشي (23.6%, 38.2%, 61.8%)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-gray-600">
                <TableHead className="text-gray-300 font-medium">الفترة</TableHead>
                <TableHead className="text-red-400 font-medium">مقاومة 3</TableHead>
                <TableHead className="text-red-400 font-medium">مقاومة 2</TableHead>
                <TableHead className="text-red-400 font-medium">مقاومة 1</TableHead>
                <TableHead className="text-blue-400 font-medium">البيفوت</TableHead>
                <TableHead className="text-green-400 font-medium">دعم 1</TableHead>
                <TableHead className="text-green-400 font-medium">دعم 2</TableHead>
                <TableHead className="text-green-400 font-medium">دعم 3</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pivotLevels.map((pivot, index) => (
                <TableRow key={index} className="border-gray-600 hover:bg-white/5">
                  <TableCell className="text-gray-300 text-xs">
                    {pivot.period}
                  </TableCell>
                  <TableCell className="text-red-400 font-mono text-sm">
                    {formatPrice(pivot.resistance3)}
                  </TableCell>
                  <TableCell className="text-red-400 font-mono text-sm">
                    {formatPrice(pivot.resistance2)}
                  </TableCell>
                  <TableCell className="text-red-400 font-mono text-sm">
                    {formatPrice(pivot.resistance1)}
                  </TableCell>
                  <TableCell className="text-blue-400 font-mono text-sm font-bold">
                    {formatPrice(pivot.pivot)}
                  </TableCell>
                  <TableCell className="text-green-400 font-mono text-sm">
                    {formatPrice(pivot.support1)}
                  </TableCell>
                  <TableCell className="text-green-400 font-mono text-sm">
                    {formatPrice(pivot.support2)}
                  </TableCell>
                  <TableCell className="text-green-400 font-mono text-sm">
                    {formatPrice(pivot.support3)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div className="bg-red-500/20 p-3 rounded-lg border border-red-500/30">
            <h4 className="text-red-400 font-medium mb-1">مستويات المقاومة</h4>
            <p className="text-gray-300 text-xs">
              المستويات التي قد يواجه السعر صعوبة في تجاوزها للأعلى
            </p>
          </div>
          <div className="bg-blue-500/20 p-3 rounded-lg border border-blue-500/30">
            <h4 className="text-blue-400 font-medium mb-1">نقطة البيفوت</h4>
            <p className="text-gray-300 text-xs">
              النقطة المرجعية المحسوبة من أعلى وأدنى وإغلاق الفترة
            </p>
          </div>
          <div className="bg-green-500/20 p-3 rounded-lg border border-green-500/30">
            <h4 className="text-green-400 font-medium mb-1">مستويات الدعم</h4>
            <p className="text-gray-300 text-xs">
              المستويات التي قد تدعم السعر من الانخفاض أكثر
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-purple-500/20 rounded-lg border border-purple-500/30">
          <h4 className="text-purple-400 font-medium mb-2">نسب فيبوناتشي المستخدمة:</h4>
          <div className="grid grid-cols-3 gap-4 text-xs text-gray-300">
            <div>23.6% - مستوى تصحيح ضعيف</div>
            <div>38.2% - مستوى تصحيح متوسط</div>
            <div>61.8% - مستوى تصحيح قوي (النسبة الذهبية)</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FibonacciPivotTable;
