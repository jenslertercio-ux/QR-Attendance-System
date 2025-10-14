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
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Upload QR Code Images</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select multiple image files containing QR codes
          </p>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing}>
            <Upload className="w-4 h-4 mr-2" />
            Browse Files
          </Button>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-8 text-center hover:border-primary transition-colors">
          <input
            ref={folderInputRef}
            type="file"
            {...{ webkitdirectory: '', directory: '' } as any}
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <Folder className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="font-semibold mb-2">Upload Folder</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Select a folder containing QR code images
          </p>
          <Button onClick={() => folderInputRef.current?.click()} disabled={isProcessing}>
            <Folder className="w-4 h-4 mr-2" />
            Select Folder
          </Button>
        </div>
      </div>

      {isProcessing && (
        <div className="bg-card border border-border rounded-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h4 className="font-semibold">Processing QR Codes</h4>
            <span className="text-sm text-muted-foreground">
              {progress.current} / {progress.total}
            </span>
          </div>
          <div className="w-full bg-secondary rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-300"
              style={{ width: `${(progress.current / progress.total) * 100}%` }}
            />
          </div>
          <div className="flex items-center justify-center mt-4">
            <Loader2 className="w-5 h-5 animate-spin mr-2" />
            <span className="text-sm text-muted-foreground">Processing images...</span>
          </div>
        </div>
      )}

      {uploadResults.length > 0 && !isProcessing && (
        <div className="bg-card border border-border rounded-lg p-6">
          <h4 className="font-semibold mb-4">Upload Results</h4>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {uploadResults.map((result, index) => (
              <div 
                key={index}
                className={`flex items-start gap-3 p-3 rounded-lg ${
                  result.success ? 'bg-accent/10' : 'bg-destructive/10'
                }`}
              >
                {result.success ? (
                  <CheckCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="w-5 h-5 text-destructive flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{result.fileName}</p>
                  <p className="text-xs text-muted-foreground">{result.message}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
