"use client";

import { useEffect, useState } from "react";
import { formatNumber, formatPercent } from "@/lib/utils";

interface Quote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface MarketData {
  indices: Quote[];
  commodities: Quote[];
  currencies: Quote[];
}

function TickerItem({ q }: { q: Quote }) {
  const up = (q.changePercent ?? 0) >= 0;
  const color = q.changePercent == null ? "text-pink-200" : up ? "text-emerald-300" : "text-rose-300";
  return (
    <span className="inline-flex items-center gap-1.5 mx-4 font-mono text-xs tabular-nums whitespace-nowrap">
      <span className="font-semibold text-pink-100">{q.name}</span>
      <span className="text-pink-200">{q.price != null ? formatNumber(q.price) : "—"}</span>
      <span className={color}>
        {up ? "▲" : "▼"} {formatPercent(q.changePercent)}
      </span>
    </span>
  );
}

export function TickerTape() {
  const [quotes, setQuotes] = useState<Quote[]>([]);

  useEffect(() => {
    const load = () => {
      fetch("/api/markets")
        .then((r) => r.json())
        .then((d: MarketData) => {
          const all = [
            ...(d.indices || []),
            ...(d.commodities || []),
            ...(d.currencies || []),
          ].filter((q) => q.price != null);
          setQuotes(all);
        })
        .catch(() => {});
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  if (quotes.length === 0) {
    return (
      <div className="h-8 bg-gradient-to-r from-pink-900 via-fuchsia-900 to-purple-900 flex items-center px-4">
        <span className="text-xs text-pink-200 font-mono">Loading market ticker...</span>
      </div>
    );
  }

  // Duplicate the quotes so the loop seamlessly wraps
  const doubled = [...quotes, ...quotes];

  return (
    <div className="h-8 bg-gradient-to-r from-pink-900 via-fuchsia-900 to-purple-900 flex items-center overflow-hidden relative">
      <div className="absolute left-0 top-0 bottom-0 w-14 bg-gradient-to-r from-pink-900 to-transparent z-10 flex items-center pl-3">
        <span className="text-[10px] font-bold text-pink-100 tracking-widest uppercase flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-400 blink" />
          LIVE
        </span>
      </div>
      <div className="ticker-scroll flex items-center pl-20">
        {doubled.map((q, i) => (
          <TickerItem key={`${q.symbol}-${i}`} q={q} />
        ))}
      </div>
    </div>
  );
}
