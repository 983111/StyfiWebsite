import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Upload, Download, Image as ImageIcon, Sliders, RotateCcw, Sparkles, Sun, Aperture, Check } from 'lucide-react';

const ImageEnhancer: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  
  // Basic Filter State
  const [filters, setFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    warmth: 0
  });

  // Advanced Feature State
  const [aiFeatures, setAiFeatures] = useState({
    sharpen: false,
    studioLighting: false, 
    smartTone: false,
  });

  const [smartToneConfig, setSmartToneConfig] = useState({
    blackPoint: 0,
    whitePoint: 255,
    gamma: 1,
    shadowLift: 0,
    highlightRollOff: 0,
  });

  const [isProcessing, setIsProcessing] = useState(false);
  const [isAnalyzed, setIsAnalyzed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setOriginalImage(file);
      const url = URL.createObjectURL(file);
      setPreviewOriginal(url);
      setEnhancedImage(url);
      setFilters({ brightness: 100, contrast: 100, saturation: 100, warmth: 0 });
      setAiFeatures({ sharpen: false, studioLighting: false, smartTone: false });
      setSmartToneConfig({ blackPoint: 0, whitePoint: 255, gamma: 1, shadowLift: 0, highlightRollOff: 0 });
      setIsAnalyzed(false);
    }
  };

  const applySmartTone = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    config: typeof smartToneConfig
  ) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    const range = Math.max(1, config.whitePoint - config.blackPoint);

    for (let i = 0; i < pixels.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let normalized = (pixels[i + c] - config.blackPoint) / range;
        normalized = Math.min(1, Math.max(0, normalized));

        // Gamma and tonal curve for a more natural enhancement.
        let toned = Math.pow(normalized, config.gamma);

        if (config.shadowLift > 0) {
          toned += (1 - toned) * config.shadowLift * (1 - toned);
        }
        if (config.highlightRollOff > 0) {
          toned -= config.highlightRollOff * toned * toned;
        }

        pixels[i + c] = Math.round(Math.min(255, Math.max(0, toned * 255)));
      }
    }

    ctx.putImageData(imageData, 0, 0);
  };

  // Advanced Unsharp Mask Sharpening
  // Uses edge detection (Laplacian) with a threshold to only sharpen details, not noise.
  const applySmartSharpen = (ctx: CanvasRenderingContext2D, width: number, height: number, strength: number = 0.25, threshold: number = 10) => {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;
    const output = ctx.createImageData(width, height);
    const dst = output.data;

    // Laplacian neighbor offsets
    const w = width * 4;
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const idx = (y * width + x) * 4;
        
        // Pass through alpha
        dst[idx + 3] = pixels[idx + 3];

        // Skip edges
        if (y === 0 || y === height - 1 || x === 0 || x === width - 1) {
            dst[idx] = pixels[idx];
            dst[idx + 1] = pixels[idx + 1];
            dst[idx + 2] = pixels[idx + 2];
            continue;
        }

        // Apply for RGB
        for (let c = 0; c < 3; c++) {
            const val = pixels[idx + c];
            
            // Laplacian Filter (High Pass)
            // 4 * Center - Top - Bottom - Left - Right
            const laplacian = (4 * val) 
                            - pixels[idx - w + c] // Top
                            - pixels[idx + w + c] // Bottom
                            - pixels[idx - 4 + c] // Left
                            - pixels[idx + 4 + c]; // Right
            
            // Thresholding: Only sharpen if the edge is strong enough (avoids noise)
            if (Math.abs(laplacian) > threshold) {
                // Add weighted high-pass signal back to original
                let newVal = val + (laplacian * strength);
                newVal = Math.min(255, Math.max(0, newVal));
                dst[idx + c] = newVal;
            } else {
                dst[idx + c] = val;
            }
        }
      }
    }
    ctx.putImageData(output, 0, 0);
  };

  const applyAutoEnhance = () => {
    if (!previewOriginal) return;
    setIsProcessing(true);

    const img = new Image();
    img.src = previewOriginal;
    img.crossOrigin = "anonymous";
    
    img.onload = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        
        // Use a reasonable size for analysis statistics
        const analysisScale = Math.min(1, 300 / img.width);
        canvas.width = img.width * analysisScale;
        canvas.height = img.height * analysisScale;
        
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const data = imageData.data;
        
        // Advanced Statistical Analysis (Histogram-based)
        let minLum = 255, maxLum = 0;
        let totalLum = 0;
        let totalLumSq = 0;
        let rSum = 0, gSum = 0, bSum = 0;
        const histogram = new Array(256).fill(0);
        
        for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];
            
            // Perceived luminance
            const lum = 0.299 * r + 0.587 * g + 0.114 * b;
            
            if (lum < minLum) minLum = lum;
            if (lum > maxLum) maxLum = lum;
            totalLum += lum;
            totalLumSq += lum * lum;

            histogram[Math.round(lum)] += 1;
            
            rSum += r;
            gSum += g;
            bSum += b;
        }
        
        const pixelCount = data.length / 4;
        const avgLum = totalLum / pixelCount;
        const lumStd = Math.sqrt(Math.max(0, (totalLumSq / pixelCount) - (avgLum * avgLum)));
        const avgR = rSum / pixelCount;
        const avgG = gSum / pixelCount;
        const avgB = bSum / pixelCount;

        let cumulative = 0;
        let p2 = 0;
        let p98 = 255;
        for (let i = 0; i < histogram.length; i++) {
          cumulative += histogram[i];
          if (cumulative >= pixelCount * 0.02) {
            p2 = i;
            break;
          }
        }

        cumulative = 0;
        for (let i = histogram.length - 1; i >= 0; i--) {
          cumulative += histogram[i];
          if (cumulative >= pixelCount * 0.02) {
            p98 = i;
            break;
          }
        }

        // 1. Exposure & Brightness Correction
        let targetBrightness = 100;
        const brightnessDeficit = 115 - avgLum;
        targetBrightness += brightnessDeficit * 0.7;
        targetBrightness = Math.max(90, Math.min(140, targetBrightness));

        // 2. Dynamic Contrast
        const range = maxLum - minLum;
        let targetContrast = 100;
        
        if (range < 120) {
             targetContrast = 120 + ((120 - range) * 0.15);
        } else if (range > 220) {
             targetContrast = 105;
        } else {
             targetContrast = 112;
        }

        // 3. Color Temperature (Auto-Warmth)
        let targetWarmth = 0;
        if (avgB > avgR + 10) {
             const diff = avgB - avgR;
             targetWarmth = diff * 0.6; 
        }
        targetWarmth = Math.min(30, targetWarmth);

        let targetSaturation = 120;
        if (lumStd < 42) targetSaturation = 132;
        if (lumStd > 68) targetSaturation = 112;

        const dynamicRange = Math.max(20, p98 - p2);
        const smartToneGamma = avgLum < 110 ? 0.88 : avgLum > 165 ? 1.08 : 0.96;
        const shadowLift = avgLum < 120 ? 0.15 : 0.08;
        const highlightRollOff = avgLum > 150 ? 0.15 : 0.08;

        // Small white balance assist when green/magenta cast exists.
        const greenCast = avgG - ((avgR + avgB) / 2);
        if (greenCast > 8) {
          targetWarmth += 4;
        }

        setFilters({
            brightness: Math.round(targetBrightness),
            contrast: Math.round(targetContrast),
            saturation: targetSaturation,
            warmth: Math.round(targetWarmth)
        });

        setAiFeatures({
            sharpen: true,
            studioLighting: true,
            smartTone: true,
        });

        setSmartToneConfig({
            blackPoint: Math.max(0, p2 - 6),
            whitePoint: Math.min(255, p2 + dynamicRange + 8),
            gamma: smartToneGamma,
            shadowLift,
            highlightRollOff,
        });
        
        setIsAnalyzed(true);
        setIsProcessing(false);
    };
  };

  const processImage = useCallback(() => {
    if (!previewOriginal) return;

    setIsProcessing(true);
    requestAnimationFrame(() => {
        const img = new Image();
        img.src = previewOriginal;
        img.crossOrigin = "anonymous"; 

        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) return;

          canvas.width = img.width;
          canvas.height = img.height;

          // 1. Basic CSS-style Filters
          ctx.filter = `brightness(${filters.brightness}%) contrast(${filters.contrast}%) saturate(${filters.saturation}%) sepia(${filters.warmth}%)`;
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          ctx.filter = 'none';

          // 2. Pixel Manipulation (Smart Sharpen)
          if (aiFeatures.smartTone) {
            applySmartTone(ctx, canvas.width, canvas.height, smartToneConfig);
          }

          // 3. Pixel Manipulation (Smart Sharpen)
          if (aiFeatures.sharpen) {
             // Use Smart Sharpen with strength 0.3 and threshold 12 to avoid noise
             applySmartSharpen(ctx, canvas.width, canvas.height, 0.3, 12);
          }

          // 4. Studio Lighting (Subtle Vignette + Center Fill)
          if (aiFeatures.studioLighting) {
             const gradient = ctx.createRadialGradient(
                canvas.width / 2, canvas.height / 2, canvas.width * 0.15, // Inner
                canvas.width / 2, canvas.height / 2, canvas.width * 0.85  // Outer
             );
             gradient.addColorStop(0, 'rgba(255, 255, 255, 0.08)'); 
             gradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
             gradient.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
             
             ctx.globalCompositeOperation = 'source-over';
             ctx.fillStyle = gradient;
             ctx.fillRect(0, 0, canvas.width, canvas.height);
          }

          const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
          setEnhancedImage(dataUrl);
          setIsProcessing(false);
        };
    });
  }, [previewOriginal, filters, aiFeatures, smartToneConfig]);

  // Real-time update
  useEffect(() => {
    const timer = setTimeout(() => {
      processImage();
    }, 100);
    return () => clearTimeout(timer);
  }, [filters, aiFeatures, processImage]);

  const toggleAiFeature = (feature: keyof typeof aiFeatures) => {
    setAiFeatures(prev => ({ ...prev, [feature]: !prev[feature] }));
  };

  const handleReset = () => {
    setFilters({ brightness: 100, contrast: 100, saturation: 100, warmth: 0 });
    setAiFeatures({ sharpen: false, studioLighting: false, smartTone: false });
    setSmartToneConfig({ blackPoint: 0, whitePoint: 255, gamma: 1, shadowLift: 0, highlightRollOff: 0 });
    setIsAnalyzed(false);
  };

  const updateFilter = (key: keyof typeof filters, value: number) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
       <div className="text-center mb-12">
        <h2 className="text-3xl font-bold text-gray-900">Seller Studio</h2>
        <p className="mt-2 text-gray-600">Turn amateur photos into professional listings with one click.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
        
        {/* Controls Side */}
        <div className="md:col-span-4 space-y-6">
            
            {/* Upload Area */}
            <div 
                className="bg-white rounded-2xl border-2 border-dashed border-gray-300 h-40 flex flex-col items-center justify-center cursor-pointer hover:border-rose-400 hover:bg-rose-50 transition-all relative overflow-hidden group"
                onClick={() => fileRef.current?.click()}
            >
                 {previewOriginal ? (
                    <img src={previewOriginal} alt="Original" className="w-full h-full object-cover opacity-50 group-hover:opacity-30 transition-opacity" />
                 ) : (
                    <div className="text-center p-6">
                        <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 group-hover:bg-rose-100 transition-colors">
                            <Upload className="w-5 h-5 text-gray-400 group-hover:text-rose-500" />
                        </div>
                        <p className="font-medium text-gray-900 text-sm">Upload Photo</p>
                    </div>
                 )}
                 {previewOriginal && (
                    <div className="absolute inset-0 flex items-center justify-center">
                        <span className="bg-white/90 backdrop-blur-sm px-4 py-2 rounded-full text-xs font-bold text-gray-700 shadow-sm border border-gray-200">Change Image</span>
                    </div>
                 )}
                 <input type="file" ref={fileRef} className="hidden" accept="image/*" onChange={handleUpload} />
            </div>

            {/* AI Auto Button */}
            <button 
                onClick={applyAutoEnhance}
                disabled={!originalImage || isAnalyzed}
                className={`w-full py-4 rounded-xl font-bold shadow-lg transition-all flex justify-center items-center relative overflow-hidden group ${
                    isAnalyzed 
                    ? 'bg-green-500 text-white cursor-default'
                    : 'bg-gradient-to-r from-rose-600 to-rose-500 text-white hover:shadow-rose-200 hover:scale-[1.02]'
                } disabled:opacity-70`}
            >
                 {isAnalyzed ? (
                     <>
                        <Check className="w-5 h-5 mr-2" />
                        Enhanced!
                     </>
                 ) : (
                     <>
                        <Sparkles className="w-5 h-5 mr-2 animate-pulse" />
                        One-Click AI Enhance
                     </>
                 )}
                 {/* Shine effect */}
                 {!isAnalyzed && <div className="absolute top-0 -left-full w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent group-hover:animate-[shimmer_1.5s_infinite]" />}
            </button>

            {/* Manual Controls */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-center mb-6">
                    <h3 className="font-bold text-gray-800 flex items-center">
                        <Sliders className="w-4 h-4 mr-2" /> Fine Tune
                    </h3>
                    <button onClick={handleReset} className="text-xs text-rose-600 font-medium hover:underline flex items-center">
                        <RotateCcw className="w-3 h-3 mr-1" /> Reset
                    </button>
                </div>

                <div className="space-y-6">
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-500">Brightness</label>
                            <span className="text-xs text-gray-400 font-mono">{filters.brightness}%</span>
                        </div>
                        <input 
                            type="range" min="50" max="150" value={filters.brightness} 
                            onChange={(e) => updateFilter('brightness', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-500">Contrast</label>
                            <span className="text-xs text-gray-400 font-mono">{filters.contrast}%</span>
                        </div>
                        <input 
                            type="range" min="50" max="150" value={filters.contrast} 
                            onChange={(e) => updateFilter('contrast', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                    </div>
                    <div>
                        <div className="flex justify-between mb-2">
                            <label className="text-xs font-semibold text-gray-500">Vibrance</label>
                            <span className="text-xs text-gray-400 font-mono">{filters.saturation}%</span>
                        </div>
                        <input 
                            type="range" min="0" max="200" value={filters.saturation} 
                            onChange={(e) => updateFilter('saturation', parseInt(e.target.value))}
                            className="w-full h-2 bg-gray-100 rounded-lg appearance-none cursor-pointer accent-rose-600"
                        />
                    </div>
                    
                    <div className="pt-4 border-t border-gray-100 grid grid-cols-2 gap-3">
                         <button 
                            onClick={() => toggleAiFeature('sharpen')}
                            className={`flex items-center justify-center p-2 rounded-lg text-xs font-medium border transition-colors ${
                                aiFeatures.sharpen 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                            }`}
                        >
                            <Aperture className="w-3 h-3 mr-2" /> Smart Sharpen
                        </button>
                        <button 
                            onClick={() => toggleAiFeature('studioLighting')}
                            className={`flex items-center justify-center p-2 rounded-lg text-xs font-medium border transition-colors ${
                                aiFeatures.studioLighting 
                                ? 'bg-rose-50 text-rose-700 border-rose-200' 
                                : 'bg-gray-50 text-gray-600 border-transparent hover:bg-gray-100'
                            }`}
                        >
                            <Sun className="w-3 h-3 mr-2" /> Studio Light
                        </button>
                    </div>
                </div>
            </div>
        </div>

        {/* Output Side */}
        <div className="md:col-span-8 bg-gray-100 rounded-2xl border border-gray-200 flex flex-col items-center justify-center relative min-h-[600px] overflow-hidden">
            {/* Checkerboard pattern for transparency */}
            <div className="absolute inset-0 opacity-10" 
                 style={{backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '20px 20px'}}>
            </div>

            {enhancedImage ? (
                <div className="relative w-full h-full flex flex-col items-center justify-center p-4">
                     <img 
                        src={enhancedImage} 
                        alt="Enhanced" 
                        className="max-h-[550px] w-auto max-w-full object-contain shadow-2xl rounded-lg" 
                     />
                     
                     <div className="absolute bottom-6 right-6 flex gap-2">
                        {isProcessing && (
                            <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-full shadow-sm text-xs font-medium text-rose-600 flex items-center">
                                <Sparkles className="w-3 h-3 mr-1 animate-spin" /> Processing...
                            </div>
                        )}
                        <a 
                            href={enhancedImage} 
                            download="styfi-enhanced.jpg" 
                            className="bg-white text-gray-900 hover:bg-gray-50 px-4 py-2 rounded-full font-semibold shadow-lg transition-all flex items-center border border-gray-200 group"
                        >
                            <Download className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" /> Download
                        </a>
                     </div>
                </div>
            ) : (
                <div className="text-center text-gray-400 relative z-10">
                    <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mx-auto mb-4 shadow-sm">
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                    </div>
                    <p className="font-medium text-gray-500">Import a photo to start editing</p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
};

export default ImageEnhancer;
