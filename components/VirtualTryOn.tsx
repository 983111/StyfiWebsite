import React, { useEffect, useRef, useState } from "react";
import type { Product, LoadingState } from "../types";
import { tryOnVirtual } from "../services/geminiService";
import { Camera, Upload, RefreshCw, FileText, Download } from "lucide-react";

interface VirtualTryOnProps {
  products: Product[];
}

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const VirtualTryOn: React.FC<VirtualTryOnProps> = ({ products }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [userImage, setUserImage] = useState<File | null>(null);
  const [userImagePreview, setUserImagePreview] = useState<string | null>(null);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [visualizationGuide, setVisualizationGuide] = useState<string | null>(null);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (userImagePreview) URL.revokeObjectURL(userImagePreview);
    };
  }, [userImagePreview]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setGeneratedImage(null);
    setVisualizationGuide(null);
    setError("");
    setStatus("idle");

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setUserImage(null);
      setUserImagePreview(null);
      setError("Choose a JPEG, PNG or WebP image.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setUserImage(null);
      setUserImagePreview(null);
      setError("Your photo must be 6 MB or smaller.");
      return;
    }

    setUserImage(file);
    setUserImagePreview(URL.createObjectURL(file));
  };

  const handleGenerate = async () => {
    if (!userImage || !selectedProduct || status === "loading") return;

    setStatus("loading");
    setError("");
    setGeneratedImage(null);
    setVisualizationGuide(null);

    try {
      const result = await tryOnVirtual(userImage, selectedProduct.image);
      if (result.type === "image") setGeneratedImage(result.data);
      else setVisualizationGuide(result.data);
      setStatus("success");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Virtual try-on failed. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center mb-10">
        <h2 className="text-3xl font-bold text-gray-900">Virtual Try-On</h2>
        <p className="mt-2 text-gray-600">Choose a demo garment and upload a full-body photo to generate an AI try-on preview.</p>
        <p className="mt-2 text-xs text-gray-400">Use a clear, front-facing photo. Images are sent to the configured AI service for processing.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-8">
          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">1. Select Product</h3>
            <div className="flex overflow-x-auto gap-4 pb-4 no-scrollbar">
              {products.map((product) => (
                <button
                  type="button"
                  key={product.id}
                  aria-pressed={selectedProduct?.id === product.id}
                  onClick={() => {
                    setSelectedProduct(product);
                    setGeneratedImage(null);
                    setVisualizationGuide(null);
                    setError("");
                    setStatus("idle");
                  }}
                  className={`flex-shrink-0 w-32 text-left rounded-xl p-1 transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 ${selectedProduct?.id === product.id ? "ring-2 ring-rose-500" : "opacity-75 hover:opacity-100"}`}
                >
                  <img src={product.image} className="w-32 h-40 object-cover rounded-lg mb-2" alt={product.name} />
                  <span className="block text-xs font-medium truncate">{product.name}</span>
                </button>
              ))}
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-semibold mb-4 text-gray-800">2. Upload Your Photo</h3>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full border-2 border-dashed border-rose-200 rounded-xl h-64 flex flex-col items-center justify-center cursor-pointer hover:bg-rose-50 transition-colors bg-gray-50 relative overflow-hidden"
            >
              {userImagePreview ? (
                <img src={userImagePreview} className="w-full h-full object-contain" alt="Your uploaded photo" />
              ) : (
                <>
                  <Upload className="w-10 h-10 text-rose-300 mb-2" />
                  <span className="text-sm text-gray-500">Choose a full-body photo</span>
                  <span className="text-xs text-gray-400 mt-1">JPEG, PNG or WebP · up to 6 MB</span>
                </>
              )}
            </button>
            <input
              type="file"
              ref={fileInputRef}
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleImageUpload}
            />
          </section>

          {error && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleGenerate}
            disabled={!selectedProduct || !userImage || status === "loading"}
            className="w-full py-4 bg-rose-600 text-white rounded-xl font-bold shadow-lg hover:bg-rose-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-all flex justify-center items-center"
          >
            {status === "loading" ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin mr-2" />
                Generating preview…
              </>
            ) : (
              "Generate Virtual Try-On"
            )}
          </button>
        </div>

        <section className="bg-white rounded-2xl shadow-sm border border-rose-100 p-8 flex flex-col items-center justify-center min-h-[600px] relative" aria-live="polite">
          <h3 className="absolute top-6 left-6 text-lg font-semibold text-gray-800">AI Preview</h3>

          {generatedImage ? (
            <div className="w-full flex flex-col items-center pt-8">
              <img src={generatedImage} alt="AI-generated virtual try-on" className="max-h-[550px] max-w-full rounded-lg object-contain" />
              <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
                <span className="text-xs text-rose-600 font-medium bg-rose-50 px-3 py-1 rounded-full">AI-generated preview</span>
                <a href={generatedImage} download="styfi-virtual-tryon.png" className="inline-flex items-center gap-2 text-sm font-semibold text-gray-700 hover:text-rose-600">
                  <Download className="w-4 h-4" /> Download
                </a>
              </div>
            </div>
          ) : visualizationGuide ? (
            <div className="w-full pt-12">
              <div className="bg-rose-50 rounded-xl p-6 border border-rose-100">
                <div className="flex items-center mb-4 text-rose-600">
                  <FileText className="w-6 h-6 mr-2" />
                  <h4 className="font-bold text-lg">Styling description</h4>
                </div>
                <p className="text-sm text-gray-700 whitespace-pre-wrap">{visualizationGuide}</p>
                <p className="mt-4 text-xs text-gray-500">The model returned a text guide rather than an edited image.</p>
              </div>
            </div>
          ) : status === "loading" ? (
            <div className="text-center text-rose-600">
              <RefreshCw className="w-10 h-10 animate-spin mx-auto mb-4" />
              <p className="font-medium">The image model is generating your preview…</p>
              <p className="text-xs text-gray-400 mt-2">This can take a little while.</p>
            </div>
          ) : (
            <div className="text-center text-gray-400 pt-8">
              <div className="w-20 h-20 bg-rose-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-10 h-10 text-rose-300" />
              </div>
              <p className="max-w-xs mx-auto">Your generated try-on image will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default VirtualTryOn;
