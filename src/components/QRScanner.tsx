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
    <div className="space-y-6 flex flex-col items-center">
      <div 
        id="qr-reader" 
        className={`rounded-2xl overflow-hidden shadow-2xl border-2 transition-all duration-500 ${
          isScanning 
            ? 'block border-primary/50 shadow-primary/20 animate-scale-in' 
            : 'hidden'
        } w-full max-w-md mx-auto hover-glow`}
        style={{
          maxHeight: isScanning ? '500px' : '0px',
          transition: 'max-height 0.5s ease-in-out'
        }}
      />
      
      {cameraError && (
        <div className="p-4 glass-card border-destructive/50 animate-fade-in-up w-full max-w-md">
          <p className="text-sm text-destructive font-medium">{cameraError}</p>
        </div>
      )}

      <Button 
        onClick={onToggleScanning} 
        variant={isScanning ? "destructive" : "default"}
        size="lg"
        className={`w-full max-w-md text-base font-semibold py-6 rounded-xl transition-all duration-300 
          ${isScanning 
            ? 'bg-gradient-to-r from-destructive to-destructive/80 hover:from-destructive/90 hover:to-destructive/70 shadow-lg hover:shadow-xl' 
            : 'bg-gradient-to-r from-primary via-secondary to-accent hover:shadow-2xl hover:shadow-primary/50'
          } shimmer hover:scale-105 active:scale-95`}
      >
        {isScanning ? (
          <>
            <CameraOff className="w-5 h-5 mr-2" />
            Stop Scanning
          </>
        ) : (
          <>
            <Camera className="w-5 h-5 mr-2 animate-pulse" />
            Start Camera
          </>
        )}
      </Button>
    </div>
  );
}
