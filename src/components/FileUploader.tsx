
import { useState, useRef } from 'react';
import { Upload, FileText, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BacktestData } from '@/types/trading';
import { toast } from 'sonner';

interface FileUploaderProps {
  onDataLoad: (data: BacktestData[]) => void;
}

const FileUploader = ({ onDataLoad }: FileUploaderProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const parseCSV = (csvText: string): BacktestData[] => {
    const lines = csvText.trim().split('\n');
    const headers = lines[0].split(',');
    
    // Validate headers
    const expectedHeaders = ['timestamp', 'open', 'high', 'low', 'close', 'volume'];
    const isValidFormat = expectedHeaders.every(header => 
      headers.some(h => h.toLowerCase().trim() === header)
    );
    
    if (!isValidFormat) {
      throw new Error('تنسيق الملف غير صحيح. يجب أن يحتوي على: timestamp, open, high, low, close, volume');
    }

    const data: BacktestData[] = [];
    
    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',');
      if (values.length === headers.length) {
        try {
          const row: BacktestData = {
            timestamp: values[0].trim(),
            open: parseFloat(values[1].trim()),
            high: parseFloat(values[2].trim()),
            low: parseFloat(values[3].trim()),
            close: parseFloat(values[4].trim()),
            volume: parseFloat(values[5].trim())
          };
          
          // Validate data
          if (isNaN(row.open) || isNaN(row.high) || isNaN(row.low) || isNaN(row.close) || isNaN(row.volume)) {
            console.warn(`تم تجاهل الصف ${i + 1}: بيانات غير صحيحة`);
            continue;
          }
          
          data.push(row);
        } catch (error) {
          console.warn(`تم تجاهل الصف ${i + 1}: خطأ في التحليل`);
        }
      }
    }
    
    return data;
  };

  const handleFile = async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.csv')) {
      toast.error('يجب أن يكون الملف من نوع CSV');
      return;
    }

    setIsProcessing(true);
    
    try {
      const text = await file.text();
      const data = parseCSV(text);
      
      if (data.length === 0) {
        toast.error('الملف فارغ أو لا يحتوي على بيانات صحيحة');
        return;
      }
      
      onDataLoad(data);
      toast.success(`تم تحميل ${data.length} سجل بنجاح`);
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast.error(error instanceof Error ? error.message : 'خطأ في قراءة الملف');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFile(files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFile(files[0]);
    }
  };

  return (
    <div
      className={`border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
        isDragging
          ? 'border-purple-400 bg-purple-400/10'
          : 'border-gray-600 hover:border-gray-500'
      }`}
      onDrop={handleDrop}
      onDragOver={(e) => e.preventDefault()}
      onDragEnter={() => setIsDragging(true)}
      onDragLeave={() => setIsDragging(false)}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        onChange={handleFileSelect}
        className="hidden"
      />
      
      <div className="flex flex-col items-center gap-4">
        {isProcessing ? (
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400"></div>
        ) : (
          <div className="p-3 bg-purple-500/20 rounded-full">
            <Upload className="h-8 w-8 text-purple-400" />
          </div>
        )}
        
        <div>
          <h3 className="text-lg font-semibold text-white mb-2">
            {isProcessing ? 'جاري المعالجة...' : 'اسحب ملف CSV هنا'}
          </h3>
          <p className="text-gray-400 mb-4">
            أو انقر لتحديد ملف من جهازك
          </p>
          
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing}
            variant="outline"
            className="border-purple-400 text-purple-400 hover:bg-purple-400/10"
          >
            <FileText className="h-4 w-4 mr-2" />
            اختيار ملف
          </Button>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <AlertCircle className="h-4 w-4" />
          <span>تنسيق الملف: timestamp,open,high,low,close,volume</span>
        </div>
      </div>
    </div>
  );
};

export default FileUploader;
