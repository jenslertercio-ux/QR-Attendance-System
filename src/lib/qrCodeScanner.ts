import jsQR from 'jsqr';

export interface ScanResult {
  success: boolean;
  data?: string;
  method?: string;
  message?: string;
  debugInfo?: any;
}

export async function scanImageFile(file: File): Promise<ScanResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const img = new Image();
        
        img.onload = async () => {
          try {
            // Try multiple processing methods
            const attempts: ScanResult[] = [];
            
            // Method 1: Direct scan
            const direct = await processImageWithJsQR(img, 'direct', false);
            attempts.push(direct);
            if (direct.success) {
              resolve(direct);
              return;
            }
            
            // Method 2: With inversion
            const inverted = await processImageWithJsQR(img, 'inverted', true);
            attempts.push(inverted);
            if (inverted.success) {
              resolve(inverted);
              return;
            }
            
            // Method 3: Enhanced contrast
            const enhanced = await processEnhancedImage(img, 'enhanced-contrast');
            attempts.push(enhanced);
            if (enhanced.success) {
              resolve(enhanced);
              return;
            }
            
            // Method 4: Grayscale
            const grayscale = await processGrayscaleImage(img, 'grayscale');
            attempts.push(grayscale);
            if (grayscale.success) {
              resolve(grayscale);
              return;
            }
            
            // All attempts failed
            resolve({
              success: false,
              message: 'No QR code found in image after multiple processing attempts',
              debugInfo: {
                fileName: file.name,
                fileSize: file.size,
                imageDimensions: `${img.width}x${img.height}`,
                fileType: file.type,
                attempts: attempts.map(a => ({
                  method: a.method,
                  success: a.success
                }))
              }
            });
            
          } catch (error: any) {
            console.error('Error processing QR code:', error);
            resolve({
              success: false,
              message: 'Failed to process QR code: ' + error.message,
              debugInfo: {
                error: error.toString(),
                stack: error.stack,
                fileName: file.name
              }
            });
          }
        };
        
        img.onerror = () => {
          resolve({
            success: false,
            message: 'Failed to load image',
            debugInfo: {
              fileName: file.name,
              fileType: file.type,
              fileSize: file.size
            }
          });
        };
        
        img.src = e.target?.result as string;
        
      } catch (error: any) {
        console.error('Error reading file:', error);
        resolve({
          success: false,
          message: 'Failed to process image: ' + error.message,
          debugInfo: {
            error: error.toString(),
            fileName: file.name
          }
        });
      }
    };
    
    reader.readAsDataURL(file);
  });
}

async function processImageWithJsQR(img: HTMLImageElement, method: string, invertAttempts = false): Promise<ScanResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, method };
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: invertAttempts ? "attemptBoth" : "dontInvert",
  });
  
  if (code) {
    return { success: true, data: code.data, method: method };
  }
  
  return { success: false, method: method };
}

async function processEnhancedImage(img: HTMLImageElement, method: string): Promise<ScanResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, method };
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  // Enhance contrast
  const factor = 2;
  for (let i = 0; i < data.length; i += 4) {
    data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128));
    data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128));
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  
  if (code) {
    return { success: true, data: code.data, method: method };
  }
  
  return { success: false, method: method };
}

async function processGrayscaleImage(img: HTMLImageElement, method: string): Promise<ScanResult> {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { success: false, method };
  
  canvas.width = img.width;
  canvas.height = img.height;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  
  for (let i = 0; i < data.length; i += 4) {
    const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }
  
  ctx.putImageData(imageData, 0, 0);
  
  const code = jsQR(imageData.data, imageData.width, imageData.height, {
    inversionAttempts: "attemptBoth",
  });
  
  if (code) {
    return { success: true, data: code.data, method: method };
  }
  
  return { success: false, method: method };
}
