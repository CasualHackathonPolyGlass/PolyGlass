
"use client";

import { useState } from "react";
import { Header } from "@/app/components/header";
import HeroSection from "./components/hero-section";
import HighestROI from "./components/highest-roi";
import { motion } from "framer-motion";

export default function InsightsPage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = (url: string) => {
    setIsAnalyzing(true);
    // In a real implementation, this would trigger the backend agents.
    // For now, we simulate a delay and redirect (handled in HeroSection).
    console.log("Analyzing:", url);
    setTimeout(() => setIsAnalyzing(false), 2000);
  };

  return (
    <main className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
      <Header />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col min-h-[calc(100vh-200px)]"
      >
        <HeroSection 
          onAnalyze={handleAnalyze} 
          isAnalyzing={isAnalyzing} 
        />
        
        <HighestROI onAnalyze={handleAnalyze} />
      </motion.div>
    </main>
  );
}
