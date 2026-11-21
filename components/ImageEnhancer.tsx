import React, { useEffect, useRef, useState } from "react";
import { Upload, Download, Image as ImageIcon, Sparkles, Loader2, RotateCcw } from "lucide-react";
import { enhanceProductImage } from "../services/geminiService";

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const ImageEnhancer: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [previewOriginal, setPreviewOriginal] = useState<string | null>(null);
  const [enhancedImage, setEnhancedImage] = useState<string | null>(null);
  const [enhancementGuide, setEnhancementGuide] = useState<string | null>(null);
  const [description, setDescription] = useState(
    "Create a clean premium marketplace product photo. Improve lighting, exposure and clarity. Keep the product's exact color, shape, texture and details. Use a simple neutral studio background."
  );
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewOriginal) URL.revokeObjectURL(previewOriginal);
    };
  }, [previewOriginal]);

  const handleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setEnhancedImage(null);
    setEnhancementGuide(null);
    setError("");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setOriginalImage(null);
      setPreviewOriginal(null);
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setOriginalImage(null);
      setPreviewOriginal(null);
      setError("The image must be 8 MB or smaller.");
      return;
    }

    setOriginalImage(file);
    setPreviewOriginal(URL.createObjectURL(file));
  };

  const handleEnhance = async () => {
    if (!originalImage || isProcessing) return;

    setIsProcessing(true);
    setError("");
    setEnhancedImage(null);
    setEnhancementGuide(null);

    try {
      const result = await enhanceProductImage(originalImage, description.trim());
      if (result.type === "image") setEnhancedImage(result.data);
      else setEnhancementGuide(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Image enhancement failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setOriginalImage(null);
    setPreviewOriginal(null);
    setEnhancedImage(null);
    setEnhancementGuide(null);
    setError("");
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-gray-900">Seller Studio</h2>
        <p className="mt-2 text-gray-600">
          Upload a product photo and let Gemini create an improved marketplace-ready image.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-5">
          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Product photo</h3>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="w-full h-64 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-rose-50 hover:border-rose-300 transition-colors flex flex-col items-center justify-center overflow-hidden"
            >
              {previewOriginal ? (
                <img src={previewOriginal} alt="Original product" className="w-full h-full object-contain" />
              ) : (
                <>
                  <Upload className="w-9 h-9 text-rose-400 mb-3" />
                  <span className="text-sm font-medium text-gray-700">Choose product image</span>
                  <span className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP · up to 8 MB</span>
                </>
              )}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleUpload}
              className="hidden"
            />
            {originalImage && (
              <p className="text-xs text-gray-400 mt-3 truncate">{originalImage.name}</p>
            )}
          </section>

          <section className="bg-white rounded-2xl border border-gray-200 p-5">
            <label htmlFor="enhancement-instructions" className="block font-semibold text-gray-900 mb-2">
              Editing instructions
            </label>
            <textarea
              id="enhancement-instructions"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              rows={5}
              maxLength={1000}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm text-gray-700 outline-none focus:ring-2 focus:ring-rose-500 resize-y"
              placeholder="Describe how you want the product photo improved…"
            />
            <p className="text-xs text-gray-400 text-right mt-1">{description.length}/1000</p>
          </section>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleEnhance}
            disabled={!originalImage || isProcessing || !description.trim()}
            className="w-full py-4 rounded-xl bg-rose-600 text-white font-semibold hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Gemini is editing your image…
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                Enhance with Gemini
              </>
            )}
          </button>

          <button type="button" onClick={reset} className="w-full py-2 text-sm text-gray-500 hover:text-gray-900 flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> Reset
          </button>
        </div>

        <section className="lg:col-span-8 bg-gray-50 rounded-2xl border border-gray-200 min-h-[620px] p-6 flex flex-col" aria-live="polite">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-semibold text-gray-900">Enhanced result</h3>
            {enhancedImage && (
              <a
                href={enhancedImage}
                download="styfi-enhanced-product.png"
                className="inline-flex items-center gap-2 text-sm font-semibold text-rose-700 hover:text-rose-800"
              >
                <Download className="w-4 h-4" /> Download image
              </a>
            )}
          </div>

          {enhancedImage ? (
            <div className="flex-1 flex items-center justify-center">
              <img src={enhancedImage} alt="Gemini-enhanced product" className="max-h-[540px] max-w-full object-contain rounded-xl shadow-sm" />
            </div>
          ) : enhancementGuide ? (
            <div className="flex-1 flex flex-col justify-center">
              <div className="bg-white border border-amber-200 rounded-xl p-6">
                <h4 className="font-semibold text-gray-900 mb-2">The model returned editing guidance</h4>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{enhancementGuide}</p>
                <p className="text-xs text-gray-400 mt-4">No edited image was returned, so this guidance is not presented as an image enhancement.</p>
              </div>
            </div>
          ) : isProcessing ? (
            <div className="flex-1 flex flex-col items-center justify-center text-rose-600">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-medium">Gemini is processing the original photo…</p>
              <p className="text-xs text-gray-400 mt-2">Image editing may take a minute or more.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center mb-4">
                <ImageIcon className="w-9 h-9 text-gray-300" />
              </div>
              <p className="text-sm">Your AI-enhanced product image will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default ImageEnhancer;
