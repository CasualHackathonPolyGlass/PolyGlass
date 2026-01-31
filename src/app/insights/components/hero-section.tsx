
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import ZoomTransition from "@/components/zoom-transition";

interface HeroSectionProps {
  onAnalyze: (url: string) => void;
  isAnalyzing: boolean;
  polymarketUrl?: string; 
  setPolymarketUrl?: (url: string) => void; 
}

export default function HeroSection({ onAnalyze, isAnalyzing, polymarketUrl, setPolymarketUrl }: HeroSectionProps) {
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [isTransitioning, setIsTransitioning] = useState(false);
  const router = useRouter();

  // Sync with external URL prop
  useEffect(() => {
    if (polymarketUrl && polymarketUrl !== url) {
      setUrl(polymarketUrl);
    }
  }, [polymarketUrl]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    setPolymarketUrl?.(newUrl);
    setError("");
  };

  const validateMarketUrl = (url: string) => {
    // Support both Polymarket and Kalshi URLs
    const polymarketRegex = /^https?:\/\/(www\.)?polymarket\.com\/.+/i;
    const kalshiRegex = /^https?:\/\/(www\.)?kalshi\.com\/markets\/.+/i;
    return polymarketRegex.test(url) || kalshiRegex.test(url);
  };

  const detectPlatform = (url: string): 'polymarket' | 'kalshi' | null => {
    if (!url) return null;
    if (url.includes('polymarket.com')) return 'polymarket';
    if (url.includes('kalshi.com')) return 'kalshi';
    return null;
  };

  const detectedPlatform = detectPlatform(url);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!url) {
      setError("Please enter a Polymarket or Kalshi link");
      return;
    }

    if (!validateMarketUrl(url)) {
      setError("Please enter a valid market link");
      return;
    }

    // Trigger zoom transition
    setIsTransitioning(true);
  };

  const handleTransitionComplete = () => {
    // Navigate to analysis page
    router.push(`/insights/analysis?url=${encodeURIComponent(url)}`);
  };

  return (
    <section className="relative flex-shrink-0 flex items-center justify-center px-4 pt-12 md:pt-16 pb-6">
      <div className="container max-w-5xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.215, 0.61, 0.355, 1] }}
          className="text-center space-y-8"
        >
          <div className="space-y-6">
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4, ease: [0.215, 0.61, 0.355, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            >
              <span className="text-white drop-shadow-lg">
                Decode the noise.
              </span>
            </motion.h1>
            <motion.h1
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.5, ease: [0.215, 0.61, 0.355, 1] }}
              className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-bold tracking-tight"
            >
              <span className="text-white drop-shadow-lg">
                See the signal.
              </span>
            </motion.h1>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 1, delay: 0.6, ease: "easeOut" }}
              className="flex justify-center"
            >
              <div className="bg-white/10 backdrop-blur-sm px-6 py-4 rounded-2xl border border-white/10 max-w-2xl">
                <p className="text-lg md:text-xl text-white/80 leading-relaxed text-center">
                  Leverage AI-driven insights to master prediction markets.
                </p>
              </div>
            </motion.div>
          </div>

          <motion.form
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 1, delay: 0.8, ease: [0.215, 0.61, 0.355, 1] }}
            onSubmit={handleSubmit}
            className="space-y-4 max-w-2xl mx-auto"
          >
            <div className="relative flex gap-2 transition-all duration-300">
              <motion.div 
                className="relative"
                initial={{ width: "100%" }}
                animate={{ width: url ? "75%" : "100%" }}
                transition={{ duration: 0.3, ease: "easeInOut" }}
              >
                <Input
                  type="url"
                  placeholder="Paste Polymarket or Kalshi link..."
                  value={url}
                  onChange={(e) => handleUrlChange(e.target.value)}
                  className={`h-12 md:h-14 text-base px-4 md:px-6 bg-white/10 backdrop-blur-sm border-white/10 text-white focus:bg-white/20 focus:border-white/30 placeholder:text-white/40 w-full rounded-xl ${
                    error ? "border-red-500/50 bg-red-500/10" : ""
                  }`}
                  disabled={isAnalyzing}
                />
                {error && (
                  <motion.p
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="absolute -bottom-6 left-0 text-sm text-red-400 drop-shadow-md"
                  >
                    {error}
                  </motion.p>
                )}
              </motion.div>
              
              <AnimatePresence>
                {url && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, width: 0 }}
                    animate={{ opacity: 1, scale: 1, width: "25%" }}
                    exit={{ opacity: 0, scale: 0.8, width: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                  >
                    <Button
                      type="submit"
                      size="lg"
                      disabled={isAnalyzing || isTransitioning}
                      className="h-12 md:h-14 w-full bg-gradient-to-r from-teal-400 to-indigo-500 text-white hover:opacity-90 transition-all font-medium rounded-xl border-none"
                    >
                      {isAnalyzing || isTransitioning ? (
                        <span className="flex items-center gap-2">
                          <Sparkles className="h-4 w-4 animate-pulse" />
                        </span>
                      ) : detectedPlatform ? (
                        <span className="flex items-center gap-2 justify-center">
                          Analyze <ArrowRight className="h-4 w-4" />
                        </span>
                      ) : (
                        <ArrowRight className="h-5 w-5" />
                      )}
                    </Button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.form>
        </motion.div>
      </div>
      
      <ZoomTransition 
        isActive={isTransitioning} 
        onComplete={handleTransitionComplete}
      />
    </section>
  );
}
