import React, { useState } from "react";
import { getTrends } from "../services/geminiService";
import type { TrendReport, LoadingState } from "../types";
import { TrendingUp, Search, Loader2 } from "lucide-react";

const TrendDetector: React.FC = () => {
  const [category, setCategory] = useState("");
  const [trends, setTrends] = useState<TrendReport[]>([]);
  const [status, setStatus] = useState<LoadingState>("idle");
  const [error, setError] = useState("");

  const handleSearch = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!category.trim() || status === "loading") return;

    setStatus("loading");
    setError("");
    setTrends([]);

    try {
      const results = await getTrends(category.trim());
      setTrends(results);
      setStatus(results.length ? "success" : "error");
      if (!results.length) setError("The AI did not return any trends. Try a more specific category.");
    } catch (err) {
      setStatus("error");
      setError(err instanceof Error ? err.message : "Trend analysis failed. Please try again.");
    }
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="text-center max-w-2xl mx-auto mb-12">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Market Trend Detector</h2>
        <p className="text-gray-600 mb-8">
          Explore AI-generated fashion trend analysis for a category and discover styles, colors and keywords worth investigating.
        </p>

        <form onSubmit={handleSearch} className="relative">
          <input
            type="text"
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            placeholder="Try “Summer Dresses” or “Handmade Jewelry”"
            maxLength={150}
            required
            className="w-full px-6 py-4 pr-14 rounded-full border border-gray-200 shadow-sm focus:ring-2 focus:ring-rose-500 focus:border-transparent outline-none text-base"
          />
          <button
            type="submit"
            aria-label="Analyze trends"
            className="absolute right-2 top-2 p-2 bg-rose-600 text-white rounded-full hover:bg-rose-700 transition-colors disabled:opacity-60"
            disabled={status === "loading" || !category.trim()}
          >
            {status === "loading" ? <Loader2 className="w-6 h-6 animate-spin" /> : <Search className="w-6 h-6" />}
          </button>
        </form>
        <p className="text-xs text-gray-400 mt-3">
          Trend scores are AI estimates, not live sales or social-media measurements.
        </p>
      </div>

      {status === "error" && (
        <div role="alert" className="max-w-2xl mx-auto mb-8 rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
          {error}
        </div>
      )}

      {status === "loading" && (
        <div className="text-center py-12 text-gray-500" aria-live="polite">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-rose-600" />
          <p>Analysing {category} with Styfi AI…</p>
        </div>
      )}

      {status === "success" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trends.map((trend, index) => (
            <article key={`${trend.trendName}-${index}`} className="bg-white rounded-2xl p-6 shadow-sm border border-rose-100">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-rose-50 p-2 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-rose-600" />
                </div>
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-700">
                  AI score: {trend.popularityScore}/100
                </span>
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">{trend.trendName}</h3>
              <p className="text-gray-600 mb-6 text-sm leading-relaxed">{trend.description}</p>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Keywords</p>
                <div className="flex flex-wrap gap-2">
                  {trend.keyKeywords.map((keyword, keywordIndex) => (
                    <span key={`${keyword}-${keywordIndex}`} className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-medium">
                      #{keyword}
                    </span>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {status === "idle" && (
        <div className="text-center text-gray-400 mt-12">
          <div className="inline-block p-4 rounded-full bg-rose-50 mb-4">
            <TrendingUp className="w-8 h-8 text-rose-300" />
          </div>
          <p>Enter a category to generate a trend report.</p>
        </div>
      )}
    </div>
  );
};

export default TrendDetector;
