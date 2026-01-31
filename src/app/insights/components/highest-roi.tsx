
"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { ThreeDCarousel } from "@/components/ui/3d-carousel";
import { TrendingUp, ExternalLink } from "lucide-react";

interface FeaturedMarket {
  id: number;
  slug: string;
  question: string;
  category: string | null;
  polymarket_url: string;
  volume: number;
  end_date: string;
  current_odds: { yes: number; no: number } | null;
  sort_order: number;
  is_active: boolean;
  updated_at: string;
}

interface MarketCardProps {
  market: FeaturedMarket;
  onAnalyze: (url: string) => void;
}

// Fallback markets for development mode (only 4 for mobile)
const fallbackMarkets: FeaturedMarket[] = [
  {
    id: 1,
    slug: "bitcoin-150k-2025",
    question: "Will Bitcoin reach $150,000 by 2025?",
    category: "Crypto",
    polymarket_url: "https://polymarket.com/event/bitcoin-150k-2025",
    volume: 4320000,
    end_date: "2025-12-31T23:59:59Z",
    current_odds: { yes: 0.28, no: 0.72 },
    sort_order: 0,
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 2,
    slug: "us-recession-2025",
    question: "US recession in 2025?",
    category: "Economy",
    polymarket_url: "https://polymarket.com/event/us-recession-2025",
    volume: 9245000,
    end_date: "2025-12-31T23:59:59Z",
    current_odds: { yes: 0.085, no: 0.915 },
    sort_order: 1,
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 3,
    slug: "ethereum-5k-2025",
    question: "Will Ethereum hit $5,000 by 2025?",
    category: "Crypto",
    polymarket_url: "https://polymarket.com/event/ethereum-5k-2025",
    volume: 3899000,
    end_date: "2025-12-31T23:59:59Z",
    current_odds: { yes: 0.35, no: 0.65 },
    sort_order: 2,
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 4,
    slug: "ai-breakthrough-2025",
    question: "Will there be a major AI breakthrough in 2025?",
    category: "Tech",
    polymarket_url: "https://polymarket.com/event/ai-breakthrough-2025",
    volume: 2500000,
    end_date: "2025-12-31T23:59:59Z",
    current_odds: { yes: 0.42, no: 0.58 },
    sort_order: 3,
    is_active: true,
    updated_at: new Date().toISOString()
  },
    {
    id: 5,
    slug: "tiktok-ban-2025",
    question: "Will TikTok be banned in the US in 2025?",
    category: "Politics",
    polymarket_url: "https://polymarket.com/event/tiktok-ban-2025",
    volume: 6700000,
    end_date: "2025-12-31T23:59:59Z",
    current_odds: { yes: 0.15, no: 0.85 },
    sort_order: 4,
    is_active: true,
    updated_at: new Date().toISOString()
  },
  {
    id: 6,
    slug: "spacex-mars-2026",
    question: "SpaceX Starship to land on Mars by 2026?",
    category: "Space",
    polymarket_url: "https://polymarket.com/event/spacex-mars-2026",
    volume: 1200000,
    end_date: "2026-12-31T23:59:59Z",
    current_odds: { yes: 0.05, no: 0.95 },
    sort_order: 5,
    is_active: true,
    updated_at: new Date().toISOString()
  }
];

function MarketCard({ market, onAnalyze }: MarketCardProps) {
  const handleClick = () => {
    onAnalyze(market.polymarket_url);
  };

  const formatVolume = (volume: number) => {
    if (volume >= 1000000) {
      return `$${(volume / 1000000).toFixed(1)}M`;
    } else if (volume >= 1000) {
      return `$${(volume / 1000).toFixed(0)}k`;
    }
    return `$${volume}`;
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'Crypto':
        return 'bg-orange-500/20 text-orange-200 border-orange-500/40';
      case 'Politics':
        return 'bg-blue-500/20 text-blue-200 border-blue-500/40';
      case 'Sports':
        return 'bg-green-500/20 text-green-200 border-green-500/40';
      case 'Tech':
        return 'bg-purple-500/20 text-purple-200 border-purple-500/40';
      case 'Space':
        return 'bg-indigo-500/20 text-indigo-200 border-indigo-500/40';
      default:
        return 'bg-gray-500/20 text-gray-200 border-gray-500/40';
    }
  };

  const odds = market.current_odds;

  return (
    <div 
      className="w-[280px] md:w-[300px] h-[160px] md:h-[180px] bg-white/5 backdrop-blur-md rounded-xl md:rounded-2xl p-4 flex flex-col justify-between hover:bg-white/10 transition-all cursor-pointer border border-white/10 shadow-xl hover:shadow-2xl hover:border-white/20 group"
      onClick={handleClick}
    >
      <div className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start justify-between mb-2">
            <h3 className="font-medium text-sm text-white/90 line-clamp-2 flex-1 mr-2">
              {market.question}
            </h3>
            <ExternalLink className="w-3 h-3 text-white/40 group-hover:text-white/60 transition-colors flex-shrink-0" />
          </div>
          
          {market.category && (
            <div className="flex items-center gap-2 mb-3">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getCategoryColor(market.category)}`}>
                {market.category}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-xs">
            <div className="text-white/60">
              <span>Vol: </span>
              <span className="text-white/80 font-medium">{formatVolume(market.volume)}</span>
            </div>
            {odds && (
              <div className="text-white/60">
                <span className="text-emerald-300">Yes {Math.round(odds.yes * 100)}%</span>
                <span className="text-white/20 mx-1">|</span>
                <span className="text-rose-300">No {Math.round(odds.no * 100)}%</span>
              </div>
            )}
          </div>
          
          {odds && (
            <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div 
                className="h-full rounded-full transition-all bg-gradient-to-r from-emerald-400 to-emerald-600"
                style={{ width: `${odds.yes * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

interface HighestROIProps {
  onAnalyze: (url: string) => void;
}

export default function HighestROI({ onAnalyze }: HighestROIProps) {
  const [markets, setMarkets] = useState<FeaturedMarket[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate API fetch
    const timer = setTimeout(() => {
      setMarkets(fallbackMarkets);
      setIsLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  const marketCards = markets.map((market) => (
    <MarketCard key={market.id} market={market} onAnalyze={onAnalyze} />
  ));

  if (isLoading) {
    const skeletonCards = Array.from({ length: 6 }, (_, i) => (
      <div key={i} className="w-[300px] h-[180px] bg-white/5 backdrop-blur-sm rounded-2xl p-4 animate-pulse border border-white/10">
        <div className="h-4 bg-white/10 rounded mb-2"></div>
        <div className="h-3 bg-white/10 rounded mb-4 w-3/4"></div>
        <div className="space-y-2">
          <div className="h-2 bg-white/10 rounded"></div>
          <div className="h-1 bg-white/10 rounded"></div>
        </div>
      </div>
    ));

    return (
      <section className="relative flex-1 overflow-hidden py-8">
        <div className="w-full">
          <ThreeDCarousel 
            items={skeletonCards}
            autoRotate={false}
          />
        </div>
      </section>
    );
  }

  return (
    <section className="relative flex-1 overflow-hidden py-8">
      <div className="w-full">
        <div className="mb-2 px-6 flex flex-col items-center text-center">
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-lg font-semibold text-white/80 flex items-center gap-2 justify-center"
          >
            <TrendingUp className="h-4 w-4 text-teal-300" />
            Trending Analyses
          </motion.h2>
        </div>

        <ThreeDCarousel 
          items={marketCards}
          autoRotate={true}
          onItemClick={(index) => {
            if (markets[index]) {
              onAnalyze(markets[index].polymarket_url);
            }
          }}
        />
      </div>
    </section>
  );
}
