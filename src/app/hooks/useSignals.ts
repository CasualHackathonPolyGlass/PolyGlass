"use client";

import { useEffect, useState } from "react";
import type { Signal } from "@/types/fills";

type TimeWindow = "1h" | "6h" | "24h" | "7d";

interface UseSignalsOptions {
  window?: TimeWindow;
  limit?: number;
}

interface UseSignalsResult {
  data: Signal[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 获取跟单信号 Hook
 */
export function useSignals(options: UseSignalsOptions = {}): UseSignalsResult {
  const [data, setData] = useState<Signal[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { window = "24h", limit = 50 } = options;

  const fetchSignals = () => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams({
      window,
      limit: String(limit),
    });

    fetch(`/api/smart-money/signals?${params}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSignals();
  }, [window, limit]);

  return { data, loading, error, refetch: fetchSignals };
}
