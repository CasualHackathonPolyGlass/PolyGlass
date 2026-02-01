"use client";

import { useEffect, useState, useCallback } from "react";
import type { TraderProfileData } from "@/types/trader-profile";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface UseTraderProfileResult {
  data: TraderProfileData | null;
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

/**
 * 获取任意钱包地址的 Polymarket 交易员画像
 * @param address 钱包地址 (可选)
 */
export function useTraderProfile(address: string | null): UseTraderProfileResult {
  const [data, setData] = useState<TraderProfileData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fetchKey, setFetchKey] = useState(0);

  const refetch = useCallback(() => {
    setFetchKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!address || !ADDRESS_RE.test(address)) {
      setData(null);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    fetch(`/api/traders/${address.toLowerCase()}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.error) throw new Error(json.error);
        setData(json.data);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [address, fetchKey]);

  return { data, loading, error, refetch };
}
