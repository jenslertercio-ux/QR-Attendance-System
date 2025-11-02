import { useState, useRef } from 'react';
import { Button } from './ui/button';
import { Upload, Folder, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { scanImageFile } from '@/lib/qrCodeScanner';
import { parseQRCode, type StudentData } from '@/lib/qrCodeParser';
import { toast } from 'sonner';

interface UploadResult {
  fileName: string;
  success: boolean;
  message: string;
  studentData?: StudentData;
}

interface FileUploadScannerProps {
  onRegistrationSuccess: (studentData: StudentData) => void;
  currentSection: string;
}

export function FileUploadScanner({ onRegistrationSuccess, currentSection }: FileUploadScannerProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadResults, setUploadResults] = useState<UploadResult[]>([]);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  const processFiles = async (files: FileList) => {
    setIsProcessing(true);
    setUploadResults([]);
    setProgress({ current: 0, total: files.length });

    const results: UploadResult[] = [];

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      setProgress({ current: i + 1, total: files.length });

      try {
        const scanResult = await scanImageFile(file);

        if (scanResult.success && scanResult.data) {
          const studentData = parseQRCode(scanResult.data, currentSection);

          if (studentData) {
            onRegistrationSuccess(studentData);
            results.push({
              fileName: file.name,
              success: true,
              message: `Registered: ${studentData.name} (${studentData.id})`,
              studentData
            });
          } else {
            results.push({
              fileName: file.name,
              success: false,
              message: 'Invalid QR code format'
            });
          }
        } else {
          results.push({
            fileName: file.name,
            success: false,
            message: scanResult.message || 'Failed to scan QR code'
          });
        }
      } catch (error: any) {
        results.push({
          fileName: file.name,
          success: false,
          message: error.message || 'Error processing file'
        });
      }
    }

    setUploadResults(results);
    setIsProcessing(false);

    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`Successfully registered ${successCount} QR code${successCount > 1 ? 's' : ''}`);
    }
    if (failCount > 0) {
      toast.error(`Failed to process ${failCount} file${failCount > 1 ? 's' : ''}`);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFiles(files);
    }
  };

  return (
    <div className="space-y-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="glass-card border-2 border-dashed border-primary/30 rounded-2xl p-10 text-center hover:border-primary/60 hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 shimmer hover:scale-105 cursor-pointer">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-lg animate-float">
            <Upload className="w-8 h-8 text-primary-foreground" />
          </div>
          <h3 className="text-lg font-bold mb-2 gradient-text">Upload QR Code Images</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Select multiple image files containing QR codes
          </p>
          <Button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={isProcessing}
            size="lg"
            className="bg-gradient-to-r from-primary to-secondary hover:shadow-xl hover:shadow-primary/30 transition-all hover:scale-105"
          >
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
        </div>

        <div className="glass-card border-2 border-dashed border-accent/30 rounded-2xl p-10 text-center hover:border-accent/60 hover:shadow-2xl hover:shadow-accent/20 transition-all duration-500 shimmer hover:scale-105 cursor-pointer">
          <input
            ref={folderInputRef}
            type="file"
            {...{ webkitdirectory: '', directory: '' } as any}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-accent to-secondary flex items-center justify-center shadow-lg animate-float" style={{animationDelay: '0.5s'}}>
            <Folder className="w-8 h-8 text-accent-foreground" />
          </div>
          <h3 className="text-lg font-bold mb-2 gradient-text">Upload Folder</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Select a folder containing QR code images
          </p>
          <Button 
            onClick={() => folderInputRef.current?.click()} 
            disabled={isProcessing}
            size="lg"
            className="bg-gradient-to-r from-accent to-secondary hover:shadow-xl hover:shadow-accent/30 transition-all hover:scale-105"
          >
            <Folder className="w-4 h-4 mr-2" />
            Select Folder
          </Button>
        </div>
      </div>

      {isProcessing && (
        <div className="glass-card rounded-2xl p-8 border-2 border-primary/30 shadow-xl shadow-primary/10 animate-fade-in-up">
          <div className="flex items-center justify-between mb-6">
            <h4 className="text-lg font-bold gradient-text">Processing QR Codes</h4>
            <span className="text-sm font-semibold px-4 py-2 rounded-full bg-primary/20 text-primary">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-secondary/30 rounded-full h-3 overflow-hidden shadow-inner">
            <div 
              className="bg-gradient-to-r from-primary via-secondary to-accent h-3 rounded-full transition-all duration-500 shadow-lg"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center mt-6 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
            <span className="text-sm font-medium text-foreground">Processing images...</span>
          </div>
        </div>
      )}

      {uploadResults.length > 0 && !isProcessing && (
        <div className="glass-card rounded-2xl p-8 border-2 border-primary/20 shadow-xl animate-scale-in">
          <h4 className="text-lg font-bold mb-6 gradient-text">Upload Results</h4>
          <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
            {uploadResults.map((result, index) => (
              <div 
                key={index}
                className={`flex items-start gap-4 p-4 rounded-xl transition-all duration-300 hover:scale-102 ${
                  result.success 
                    ? 'bg-gradient-to-r from-green-500/10 to-green-500/5 border border-green-500/30 hover:border-green-500/50' 
                    : 'bg-gradient-to-r from-destructive/10 to-destructive/5 border border-destructive/30 hover:border-destructive/50'
                }`}
              >
                {result.success ? (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <CheckCircle className="w-5 h-5 text-white" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-destructive to-destructive/80 flex items-center justify-center flex-shrink-0 shadow-lg">
                    <XCircle className="w-5 h-5 text-white" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate text-foreground">{result.fileName}</p>
                  <p className="text-xs text-muted-foreground mt-1">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
