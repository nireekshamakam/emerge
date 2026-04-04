"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent, changeColor } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus, DollarSign, Landmark, Flame, Gem } from "lucide-react";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  region?: string;
  country?: string;
  category?: string;
}

interface MarketData {
  indices: MarketQuote[];
  commodities: MarketQuote[];
  bonds: MarketQuote[];
  currencies: MarketQuote[];
}

function ChangeIcon({ value }: { value: number | null }) {
  if (value == null) return <Minus className="h-3 w-3 text-muted-foreground" />;
  return value >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />;
}

function QuoteRow({ q }: { q: MarketQuote }) {
  return (
    <tr className="border-b border-border/50 hover:bg-accent/20 transition-colors">
      <td className="py-2.5 px-3">
        <div>
          <span className="font-medium text-sm">{q.name}</span>
          {q.country && <span className="text-xs text-muted-foreground ml-2">{q.country}</span>}
        </div>
      </td>
      <td className="py-2.5 px-3 text-right font-mono text-sm tabular-nums">
        {q.price != null ? formatNumber(q.price) : "—"}
      </td>
      <td className={`py-2.5 px-3 text-right font-mono text-sm tabular-nums ${changeColor(q.change)}`}>
        <span className="flex items-center justify-end gap-1">
          <ChangeIcon value={q.change} />
          {q.change != null ? formatNumber(q.change) : "—"}
        </span>
      </td>
      <td className={`py-2.5 px-3 text-right font-mono text-sm tabular-nums ${changeColor(q.changePercent)}`}>
        {formatPercent(q.changePercent)}
      </td>
    </tr>
  );
}

function MarketTable({ title, icon, quotes }: { title: string; icon: React.ReactNode; quotes: MarketQuote[] }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border text-xs text-muted-foreground">
              <th className="text-left py-2 px-3 font-medium">Name</th>
              <th className="text-right py-2 px-3 font-medium">Price</th>
              <th className="text-right py-2 px-3 font-medium">Change</th>
              <th className="text-right py-2 px-3 font-medium">% Change</th>
            </tr>
          </thead>
          <tbody>
            {quotes.map((q) => (
              <QuoteRow key={q.symbol} q={q} />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function MarketsPage() {
  const [data, setData] = useState<MarketData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/markets")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Markets" />
        <div className="p-6 grid gap-6 lg:grid-cols-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <Header title="Markets" />
        <p className="text-muted-foreground text-center mt-16">Failed to load market data.</p>
      </div>
    );
  }

  // Group indices by region
  const regions = ["Americas", "Europe", "Asia-Pacific"];
  const indexByRegion = regions.map((r) => ({
    region: r,
    quotes: data.indices.filter((q) => q.region === r),
  }));

  return (
    <div>
      <Header title="Markets" />
      <div className="p-6 space-y-6">
        {/* Currency ticker strip */}
        <div className="flex flex-wrap gap-4 p-4 bg-card rounded-lg border">
          {data.currencies.map((c) => (
            <div key={c.symbol} className="flex items-center gap-2">
              <span className="text-sm font-medium">{c.name}</span>
              <span className="font-mono text-sm tabular-nums">{formatNumber(c.price, 4)}</span>
              <span className={`font-mono text-xs tabular-nums ${changeColor(c.changePercent)}`}>
                {formatPercent(c.changePercent)}
              </span>
            </div>
          ))}
        </div>

        {/* Indices by region */}
        <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
          {indexByRegion.map((group) => (
            <MarketTable
              key={group.region}
              title={group.region}
              icon={<TrendingUp className="h-4 w-4" />}
              quotes={group.quotes}
            />
          ))}
        </div>

        {/* Commodities, Bonds */}
        <div className="grid gap-6 lg:grid-cols-2">
          <MarketTable
            title="Commodities"
            icon={<Gem className="h-4 w-4" />}
            quotes={data.commodities}
          />
          <MarketTable
            title="Bonds & Rates"
            icon={<Landmark className="h-4 w-4" />}
            quotes={data.bonds}
          />
        </div>
      </div>
    </div>
  );
}
