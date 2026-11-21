import React, { useState } from "react";
import type { Product, OutfitSuggestion, LoadingState } from "../types";
import { composeOutfit } from "../services/geminiService";
import ProductCard from "./ProductCard";
import { Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface OutfitComposerProps {
  products: Product[];
}

const OutfitComposer: React.FC<OutfitComposerProps> = ({ products }) => {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [suggestions, setSuggestions] = useState<OutfitSuggestion[]>([]);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState("");

  const handleSelect = async (product: Product) => {
    setSelectedProduct(product);
    setStatus("loading");
    setSuggestions([]);
    setError("");

    try {
      const results = await composeOutfit(product.name, product.category);
      setSuggestions(results);
      setStatus(results.length ? "success" : "error");
      if (!results.length) setError("Styfi AI did not return any recommendations. Select the item again to retry.");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Outfit recommendations failed. Please try again.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Outfit Composer</h2>
        <p className="mt-2 text-gray-600">Select a demo item to get AI-generated styling recommendations.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-5">
          <h3 className="text-lg font-semibold mb-4 text-gray-800">1. Select a Base Item</h3>
          <div className="grid grid-cols-2 gap-4 max-h-[600px] overflow-y-auto no-scrollbar pr-2">
            {products.map((product) => (
              <button
                type="button"
                key={product.id}
                aria-pressed={selectedProduct?.id === product.id}
                className={`text-left rounded-xl transition-all focus:outline-none focus:ring-2 focus:ring-rose-500 ${selectedProduct?.id === product.id ? "ring-2 ring-rose-500 opacity-100" : "opacity-80 hover:opacity-100"}`}
                onClick={() => handleSelect(product)}
              >
                <ProductCard product={product} variant="compact" />
              </button>
            ))}
          </div>
        </div>

        <div className="hidden lg:flex lg:col-span-1 items-center justify-center">
          <ArrowRight className="w-8 h-8 text-rose-300" />
        </div>

        <section className="lg:col-span-6 bg-white rounded-2xl shadow-sm border border-rose-100 p-6 flex flex-col min-h-[500px]" aria-live="polite">
          <h3 className="text-lg font-semibold mb-6 text-gray-800 flex items-center">
            <Sparkles className="w-5 h-5 text-rose-500 mr-2" />
            AI Recommendations
          </h3>

          {!selectedProduct && (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Sparkles className="w-16 h-16 mb-4 text-rose-100" />
              <p>Select a product to start styling.</p>
            </div>
          )}

          {status === "loading" && (
            <div className="flex-1 flex flex-col items-center justify-center text-rose-600">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="text-sm font-medium">Styfi AI is composing your outfit…</p>
            </div>
          )}

          {status === "error" && (
            <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          {status === "success" && selectedProduct && (
            <div className="space-y-6">
              <div className="flex items-center p-4 bg-rose-50 rounded-xl">
                <img src={selectedProduct.image} alt={selectedProduct.name} className="w-16 h-16 rounded-md object-cover mr-4" />
                <div>
                  <p className="text-xs text-rose-600 font-bold uppercase tracking-wider">Base Item</p>
                  <p className="font-semibold text-gray-900">{selectedProduct.name}</p>
                </div>
              </div>

              <div className="space-y-4">
                {suggestions.map((suggestion, index) => (
                  <div key={`${suggestion.name}-${index}`} className="flex border-b border-gray-100 pb-4 last:border-0">
                    <div className="w-1.5 bg-rose-400 rounded-full mr-4 shrink-0" />
                    <div>
                      <h4 className="font-bold text-gray-800">{suggestion.name}</h4>
                      <p className="text-sm text-gray-600 mt-1">{suggestion.reason}</p>
                      <div className="flex flex-wrap items-center mt-2 gap-3">
                        <span className="text-xs bg-gray-100 px-2 py-1 rounded text-gray-600">Est. {suggestion.estimatedPrice}</span>
                        <span className="text-xs flex items-center text-gray-600">
                          <span className="w-3 h-3 rounded-full mr-1 border border-gray-300" style={{ backgroundColor: suggestion.color.toLowerCase() }} />
                          {suggestion.color}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400">Recommendations are AI-generated styling ideas, not live product listings or verified prices.</p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
};

export default OutfitComposer;
