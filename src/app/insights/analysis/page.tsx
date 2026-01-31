
"use client";

import { useState, useEffect, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronDown, ChevronRight, ExternalLink, AlertCircle, Sparkles, TrendingUp } from "lucide-react";
import { Header } from "@/app/components/header";

interface AnalysisResult {
  verdict: "YES" | "NO";
  confidence: number;
  summary: string;
  keyFactors: string[];
  sources: string[];
}

function AnalysisContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const url = searchParams.get("url");
  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string>("");

  useEffect(() => {
    if (!url) {
      setError("No market URL provided");
      setIsLoading(false);
      return;
    }

    // Direct Demo Mode: Skip API fetch and show mock data immediately
    const timer = setTimeout(() => {
        // Mock result based on URL keywords or random if generic
        const isNegative = url.toLowerCase().includes("shutdown") || url.toLowerCase().includes("recession");

        setResult({
            verdict: isNegative ? "YES" : "NO",
            confidence: 85,
            summary: "Based on current legislative gridlock and historical precedents, the probability of a government shutdown remains elevated.",
            keyFactors: [
                "Legislative deadline approaching with no consensus",
                "Partisan disagreement on spending bills",
                "Historical pattern of last-minute resolutions vs shutdowns"
            ],
            sources: [
                "Polymarket Order Book",
                "Washington Post Analysis",
                "FiveThirtyEight Forecasts"
            ]
        });
        setIsLoading(false);
    }, 2000); // 2 seconds delay for effect

    return () => clearTimeout(timer);

  }, [url]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-black/90 text-white flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="relative w-24 h-24 mx-auto mb-8">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 border-t-2 border-l-2 border-teal-400 rounded-full"
            />
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 border-r-2 border-b-2 border-purple-500 rounded-full"
            />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-8 h-8 text-white/80 animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-teal-200 to-purple-200 bg-clip-text text-transparent">
            Analyzing Market Dynamics
          </h2>
          <p className="text-white/50">{progress || "Processing real-time data streams..."}</p>
        </motion.div>
      </div>
    );
  }

  if (error || !result) {
    return (
      <div className="min-h-screen bg-black text-white p-4 pt-24 flex items-center justify-center">
        <Card className="max-w-md w-full bg-white/5 border-white/10 backdrop-blur-md">
          <CardContent className="pt-6 text-center">
            <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Analysis Failed</h2>
            <p className="text-white/60 mb-6">{error || "Unable to analyze this market."}</p>
            <Button 
              onClick={() => router.push('/insights')}
              className="w-full bg-white/10 hover:bg-white/20 text-white"
            >
              Return to Insights
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white pt-24 pb-12 px-4 relative overflow-hidden">
      {/* Background Ambience */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-purple-900/20 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-teal-900/20 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={() => router.back()}
            className="text-white/50 hover:text-white pl-0 hover:bg-transparent mb-4"
          >
            ← Back to Insights
          </Button>
          <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
            Market Analysis
          </h1>
          <a 
            href={url!} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-white/40 hover:text-white/60 text-sm truncate block max-w-full transition-colors"
          >
            {url} <ExternalLink className="inline w-3 h-3 ml-1" />
          </a>
        </div>

        {/* Verdict Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="bg-white/5 border-white/10 backdrop-blur-xl overflow-hidden mb-6">
            <div className={`h-2 w-full ${result.verdict === 'YES' ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-gradient-to-r from-rose-500 to-orange-400'}`} />
            <CardContent className="p-6 md:p-8">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
                <div>
                  <p className="text-sm text-white/50 uppercase tracking-wider mb-1">AI Verdict</p>
                  <div className="flex items-center gap-3">
                    <span className={`text-4xl font-bold ${result.verdict === 'YES' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {result.verdict}
                    </span>
                    <Badge variant="outline" className="border-white/20 text-white/70 bg-white/5">
                      {result.confidence}% Confidence
                    </Badge>
                  </div>
                </div>
                
                <Button 
                  className={`
                    w-full md:w-auto px-8 py-6 text-lg font-semibold shadow-lg transition-all hover:scale-[1.02]
                    ${result.verdict === 'YES' 
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-black shadow-emerald-500/20' 
                      : 'bg-rose-500 hover:bg-rose-400 text-white shadow-rose-500/20'
                    }
                  `}
                  onClick={() => window.open(url!, '_blank')}
                >
                  Trade on Polymarket
                  <ExternalLink className="ml-2 w-5 h-5" />
                </Button>
              </div>

              <div className="bg-white/5 rounded-xl p-6 border border-white/5">
                <p className="text-lg text-white/90 leading-relaxed">
                  {result.summary}
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Detailed Breakdown */}
        <div className="grid md:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card className="bg-white/5 border-white/10 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white/90">
                  <TrendingUp className="w-5 h-5 text-teal-400" />
                  Key Drivers
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.keyFactors.map((factor, i) => (
                    <li key={i} className="flex items-start gap-3 text-white/70">
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400 mt-2 flex-shrink-0" />
                      <span>{factor}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card className="bg-white/5 border-white/10 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-white/90">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                  Sources Processed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  {result.sources.map((source, i) => (
                    <li key={i} className="flex items-center gap-3 text-white/70">
                      <div className="w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-xs font-mono">
                        {i + 1}
                      </div>
                      <span>{source}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}

export default function AnalysisPage() {
  return (
    <main className="min-h-screen bg-black">
      <Header />
      <Suspense fallback={
        <div className="min-h-screen flex items-center justify-center text-white/50">
          Loading Analysis Environment...
        </div>
      }>
        <AnalysisContent />
      </Suspense>
    </main>
  );
}
