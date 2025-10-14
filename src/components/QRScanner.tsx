import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from './ui/button';
import { Camera, CameraOff } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  onScanError?: (error: string) => void;
  isScanning: boolean;
  onToggleScanning: () => void;
}

export function QRScanner({ onScanSuccess, onScanError, isScanning, onToggleScanning }: QRScannerProps) {
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);

  useEffect(() => {
    if (isScanning) {
      startScanning();
    } else {
      stopScanning();
    }

    return () => {
      stopScanning();
    };
  }, [isScanning]);

  const startScanning = async () => {
    try {
      setCameraError(null);
      const html5Qrcode = new Html5Qrcode("qr-reader");
      html5QrcodeRef.current = html5Qrcode;

      await html5Qrcode.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          onScanSuccess(decodedText);
        },
        (errorMessage) => {
          // Ignore scan failures, they're normal
        }
      );
    } catch (error: any) {
      console.error('Scanner initialization error:', error);
      setCameraError(error.message || 'Failed to initialize camera');
      onScanError?.(error.message || 'Failed to initialize camera');
      onToggleScanning();
    }
  };

  const stopScanning = async () => {
    if (html5QrcodeRef.current) {
      try {
        await html5QrcodeRef.current.stop();
        html5QrcodeRef.current.clear();
      } catch (error) {
        console.error('Failed to stop scanner:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div 
        id="qr-reader" 
        className={`rounded-lg overflow-hidden ${isScanning ? 'block' : 'hidden'}`}
      />
      
      {cameraError && (
        <div className="p-4 bg-destructive/10 border border-destructive rounded-lg">
          <p className="text-sm text-destructive">{cameraError}</p>
        </div>
      )}

      <Button 
        onClick={onToggleScanning} 
        variant={isScanning ? "destructive" : "default"}
        className="w-full"
      >
        {isScanning ? (
          <>
            <CameraOff className="w-4 h-4 mr-2" />
            Stop Scanning
          </>
        ) : (
          <>
            <Camera className="w-4 h-4 mr-2" />
            Start Camera
          </>
        )}
      </Button>
    </div>
  );
}
