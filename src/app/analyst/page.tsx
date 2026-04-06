"use client";

import { Header } from "@/components/layout/Header";
import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { BrainCircuit, Search, TrendingUp, AlertCircle, Clock } from "lucide-react";
import { formatNumber, formatPercent, changeColor } from "@/lib/utils";

interface AnalystResult {
  symbol: string;
  companyName: string;
  analysis: string;
  dataSnapshot: {
    price: number | null;
    marketCap: number | null;
    pe: number | null;
    pb: number | null;
    roe: number | null;
    netMargin: number | null;
  };
  generatedAt: number;
}

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

// Simple markdown-like renderer for bold headings
function AnalysisContent({ text }: { text: string }) {
  const lines = text.split("\n");
  return (
    <div className="space-y-2 text-sm leading-relaxed">
      {lines.map((line, i) => {
        if (/^\*\*\d+\./.test(line) || /^##/.test(line)) {
          const clean = line.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim();
          return <h3 key={i} className="font-semibold text-foreground mt-4 mb-1 text-base border-b border-border pb-1">{clean}</h3>;
        }
        if (line.startsWith("**") && line.endsWith("**")) {
          return <p key={i} className="font-semibold text-foreground">{line.replace(/\*\*/g, "")}</p>;
        }
        if (line.trim() === "") return <div key={i} className="h-1" />;
        // Inline bold
        const parts = line.split(/(\*\*[^*]+\*\*)/g);
        return (
          <p key={i} className="text-foreground/80">
            {parts.map((part, j) =>
              part.startsWith("**") && part.endsWith("**")
                ? <strong key={j} className="text-foreground">{part.replace(/\*\*/g, "")}</strong>
                : part
            )}
          </p>
        );
      })}
    </div>
  );
}

function fmtMarketCap(v: number | null): string {
  if (v == null) return "—";
  if (v >= 1e9) return `₹${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e7) return `₹${(v / 1e7).toFixed(0)}Cr`;
  return `₹${v.toFixed(0)}`;
}

export default function AnalystPage() {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalystResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const handleQueryChange = (val: string) => {
    setQuery(val);
    setSelectedSymbol(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (val.length < 2) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/stocks/search?q=${encodeURIComponent(val)}`);
        const data = await res.json();
        setSuggestions(Array.isArray(data) ? data.slice(0, 6) : []);
      } catch { setSuggestions([]); }
    }, 400);
  };

  const handleSelect = (sym: SearchResult) => {
    setQuery(`${sym.name} (${sym.symbol})`);
    setSelectedSymbol(sym.symbol);
    setSuggestions([]);
  };

  const runAnalysis = async () => {
    const symbol = selectedSymbol || query.trim().toUpperCase();
    if (!symbol) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/analyst", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      const data = await res.json();
      if (data.error) {
        setError(data.error);
      } else {
        setResult(data);
      }
    } catch {
      setError("Failed to generate analysis. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Header title="AI Stock Analyst" />
      <div className="p-6 space-y-6 max-w-4xl">
        {/* Search */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Fundamental Analysis Agent
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Enter an Indian stock ticker (e.g. RELIANCE.NS, TCS.NS) to get a comprehensive AI-powered fundamental analysis.
            </p>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => handleQueryChange(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") runAnalysis(); }}
                  placeholder="Search for a stock (e.g. Reliance, TCS, HDFC Bank)"
                  className="pl-9"
                />
                {suggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-20 mt-1 bg-card border rounded-xl shadow-lg overflow-hidden">
                    {suggestions.map((s) => (
                      <button
                        key={s.symbol}
                        onClick={() => handleSelect(s)}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-accent/40 transition-colors text-left cursor-pointer"
                      >
                        <div>
                          <span className="text-sm font-medium">{s.name}</span>
                          <span className="text-xs text-muted-foreground ml-2">{s.exchange}</span>
                        </div>
                        <span className="text-xs font-mono text-primary">{s.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <Button onClick={runAnalysis} disabled={loading || !query.trim()}>
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="h-3 w-3 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
                    Analysing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <BrainCircuit className="h-4 w-4" />
                    Analyse
                  </span>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Loading state */}
        {loading && (
          <Card>
            <CardContent className="py-16 text-center">
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
                <div>
                  <p className="font-medium">Analysing {query}...</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Fetching financial data and generating analysis. This may take 15–30 seconds.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Error state */}
        {error && (
          <Card className="border-red-200 bg-red-50">
            <CardContent className="py-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-700">Analysis failed</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                  {error.includes("ANTHROPIC_API_KEY") && (
                    <p className="text-sm text-red-600 mt-2">
                      Add <code className="bg-red-100 px-1 rounded">ANTHROPIC_API_KEY=your-key</code> to your <code>.env</code> file and restart the server.
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Results */}
        {result && !loading && (
          <>
            {/* Key metrics bar */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Price", value: result.dataSnapshot.price != null ? `₹${formatNumber(result.dataSnapshot.price)}` : "—" },
                { label: "Mkt Cap", value: fmtMarketCap(result.dataSnapshot.marketCap) },
                { label: "P/E", value: result.dataSnapshot.pe != null ? formatNumber(result.dataSnapshot.pe) : "—" },
                { label: "P/B", value: result.dataSnapshot.pb != null ? formatNumber(result.dataSnapshot.pb) : "—" },
                { label: "ROE", value: result.dataSnapshot.roe != null ? formatPercent(result.dataSnapshot.roe * 100) : "—", colorVal: result.dataSnapshot.roe != null ? result.dataSnapshot.roe * 100 : null },
                { label: "Net Margin", value: result.dataSnapshot.netMargin != null ? formatPercent(result.dataSnapshot.netMargin * 100) : "—", colorVal: result.dataSnapshot.netMargin != null ? result.dataSnapshot.netMargin * 100 : null },
              ].map(({ label, value, colorVal }) => (
                <Card key={label}>
                  <CardContent className="p-3">
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className={`text-sm font-semibold mt-0.5 font-mono ${colorVal != null ? changeColor(colorVal) : ""}`}>{value}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Analysis report */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    {result.companyName} — Research Report
                  </span>
                  <span className="flex items-center gap-1.5 text-xs font-normal text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {new Date(result.generatedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <AnalysisContent text={result.analysis} />
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
