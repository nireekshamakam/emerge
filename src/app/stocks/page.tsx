"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent, changeColor, formatCurrency } from "@/lib/utils";
import { Plus, Search, Trash2, RefreshCw } from "lucide-react";

interface StockData {
  id: string;
  symbol: string;
  name: string;
  price: number | null;
  pe: number | null;
  pb: number | null;
  roe: number | null;
  roce: number | null;
  eps: number | null;
  revenueGrowth3yr: number | null;
  patGrowth3yr: number | null;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

export default function StocksPage() {
  const [stocks, setStocks] = useState<StockData[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [adding, setAdding] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const fetchStocks = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/stocks");
      const data = await res.json();
      setStocks(Array.isArray(data) ? data : []);
    } catch {
      setStocks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchStocks(); }, [fetchStocks]);

  const handleSearch = useCallback((q: string) => {
    setSearchQuery(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setSearchResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(Array.isArray(data) ? data : []);
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 300);
  }, []);

  const addStock = async (symbol: string, name: string) => {
    setAdding(symbol);
    try {
      await fetch("/api/stocks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol, name }),
      });
      setDialogOpen(false);
      setSearchQuery("");
      setSearchResults([]);
      fetchStocks();
    } finally {
      setAdding(null);
    }
  };

  const removeStock = async (id: string) => {
    try {
      await fetch(`/api/stocks/${id}`, { method: "DELETE" });
      setStocks((prev) => prev.filter((s) => s.id !== id));
    } catch { /* ignore */ }
  };

  return (
    <div>
      <Header title="Indian Stock Dashboard" />
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            {stocks.length} stock{stocks.length !== 1 ? "s" : ""} tracked
          </p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={fetchStocks} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
              Refresh
            </Button>
            <Button size="sm" onClick={() => setDialogOpen(true)}>
              <Plus className="h-4 w-4" />
              Add Stock
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : stocks.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <p className="text-muted-foreground">No stocks in your watchlist.</p>
              <Button className="mt-4" onClick={() => setDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Add your first stock
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full min-w-[900px]">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left py-3 px-3 font-medium">Stock</th>
                    <th className="text-right py-3 px-3 font-medium">Price</th>
                    <th className="text-right py-3 px-3 font-medium">PE</th>
                    <th className="text-right py-3 px-3 font-medium">PB</th>
                    <th className="text-right py-3 px-3 font-medium">ROE %</th>
                    <th className="text-right py-3 px-3 font-medium">ROCE %</th>
                    <th className="text-right py-3 px-3 font-medium">EPS</th>
                    <th className="text-right py-3 px-3 font-medium">3Y Rev Growth</th>
                    <th className="text-right py-3 px-3 font-medium">3Y PAT Growth</th>
                    <th className="py-3 px-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {stocks.map((s) => (
                    <tr key={s.id} className="border-b border-border/50 hover:bg-accent/20 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-muted-foreground">{s.symbol}</div>
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm tabular-nums">
                        {formatCurrency(s.price)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm tabular-nums">
                        {formatNumber(s.pe)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm tabular-nums">
                        {formatNumber(s.pb)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-sm tabular-nums ${changeColor(s.roe)}`}>
                        {formatPercent(s.roe)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-sm tabular-nums ${changeColor(s.roce)}`}>
                        {formatPercent(s.roce)}
                      </td>
                      <td className="py-2.5 px-3 text-right font-mono text-sm tabular-nums">
                        {formatNumber(s.eps)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-sm tabular-nums ${changeColor(s.revenueGrowth3yr)}`}>
                        {formatPercent(s.revenueGrowth3yr)}
                      </td>
                      <td className={`py-2.5 px-3 text-right font-mono text-sm tabular-nums ${changeColor(s.patGrowth3yr)}`}>
                        {formatPercent(s.patGrowth3yr)}
                      </td>
                      <td className="py-2.5 px-3">
                        <Button variant="ghost" size="icon" onClick={() => removeStock(s.id)} className="h-7 w-7">
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        )}

        {/* Add Stock Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent onClose={() => setDialogOpen(false)}>
            <DialogHeader>
              <DialogTitle>Add Stock to Watchlist</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search Indian stocks (e.g. Reliance, TCS, Infosys)..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-9"
                  autoFocus
                />
              </div>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {searching && <p className="text-sm text-muted-foreground p-2">Searching...</p>}
                {!searching && searchResults.length === 0 && searchQuery.length >= 2 && (
                  <p className="text-sm text-muted-foreground p-2">No results found.</p>
                )}
                {searchResults.map((r) => (
                  <div
                    key={r.symbol}
                    className="flex items-center justify-between p-2 rounded-md hover:bg-accent/50 transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">{r.symbol} &middot; {r.exchange}</div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => addStock(r.symbol, r.name)}
                      disabled={adding === r.symbol}
                    >
                      {adding === r.symbol ? "Adding..." : "Add"}
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
