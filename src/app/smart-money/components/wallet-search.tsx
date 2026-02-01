"use client";

import { useState, useCallback } from "react";
import { Search, X, Loader2 } from "lucide-react";

const ADDRESS_RE = /^0x[a-fA-F0-9]{40}$/;

interface WalletSearchProps {
  onSearch: (address: string) => void;
  loading?: boolean;
}

export function WalletSearch({ onSearch, loading = false }: WalletSearchProps) {
  const [input, setInput] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = useCallback(() => {
    const trimmed = input.trim();
    if (!trimmed) {
      setValidationError("Please enter a wallet address");
      return;
    }
    if (!ADDRESS_RE.test(trimmed)) {
      setValidationError("Invalid address format (0x + 40 hex chars)");
      return;
    }
    setValidationError(null);
    onSearch(trimmed.toLowerCase());
  }, [input, onSearch]);

  const handleClear = useCallback(() => {
    setInput("");
    setValidationError(null);
    onSearch("");
  }, [onSearch]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleSubmit();
    },
    [handleSubmit],
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={input}
            onChange={(e) => { setInput(e.target.value); setValidationError(null); }}
            onKeyDown={handleKeyDown}
            placeholder="Enter wallet address (0x...)"
            className="h-10 w-full rounded-lg border border-white/10 bg-white/5 pl-10 pr-10 text-sm text-white placeholder:text-white/30 focus:border-teal-500/50 focus:outline-none focus:ring-1 focus:ring-teal-500/30"
          />
          {input && (
            <button
              onClick={handleClear}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="flex h-10 items-center gap-2 rounded-lg bg-teal-500/20 px-4 text-sm font-medium text-teal-300 transition hover:bg-teal-500/30 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
          Search
        </button>
      </div>
      {validationError && (
        <p className="text-xs text-rose-400">{validationError}</p>
      )}
    </div>
  );
}
