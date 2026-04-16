"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/constants";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Newspaper,
  Kanban,
  Calendar,
  RefreshCw,
  Rocket,
  Flame,
  Heart,
  Star,
  Clock,
} from "lucide-react";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  region?: string;
}
interface MarketData { indices: MarketQuote[]; commodities: MarketQuote[]; fetchedAt?: number; }
interface PipelineItem { id: string; stage: string; companyName: string; }
interface Meeting { id: string; companyName: string; meetingDate: string; city: string | null; }
interface NewsItem { title: string; link: string; source: string; publishedAt: string; }
interface IPOItem { company: string; openDate: string; status: string; gmp: number | null; gmpPercent: string | null; }
interface IPOData { upcoming: IPOItem[]; gmp: IPOItem[]; }

function lastUpdatedLabel(ts: number | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.floor(hours / 24)}d`;
}

function MoverRow({ q }: { q: MarketQuote }) {
  const up = (q.changePercent ?? 0) >= 0;
  return (
    <div className="flex items-center justify-between py-1.5 px-2 hover:bg-pink-50 rounded-md transition-colors">
      <span className="text-xs font-medium truncate">{q.name}</span>
      <div className="flex items-center gap-2 font-mono tabular-nums">
        <span className="text-xs">{q.price != null ? formatNumber(q.price) : "—"}</span>
        <span className={`text-xs font-semibold flex items-center gap-0.5 ${up ? "text-emerald-600" : "text-rose-500"}`}>
          {up ? "▲" : "▼"} {formatPercent(q.changePercent)}
        </span>
      </div>
    </div>
  );
}

function IndexCell({ q }: { q: MarketQuote }) {
  const up = (q.changePercent ?? 0) >= 0;
  return (
    <div className="p-3 rounded-lg bg-gradient-to-br from-white to-pink-50 border border-pink-200/60 hover:shadow-[0_4px_12px_rgba(236,72,153,0.15)] transition-all">
      <p className="text-[10px] font-bold tracking-widest text-pink-600 uppercase">{q.name}</p>
      <p className="text-lg font-mono font-bold tabular-nums mt-0.5 text-fuchsia-900">
        {q.price != null ? formatNumber(q.price) : "—"}
      </p>
      <p className={`text-xs font-mono font-semibold tabular-nums flex items-center gap-1 ${up ? "text-emerald-600" : "text-rose-500"}`}>
        {up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
        {q.change != null ? formatNumber(q.change) : "—"} ({formatPercent(q.changePercent)})
      </p>
    </div>
  );
}

export default function DashboardPage() {
  const [markets, setMarkets] = useState<MarketData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [ipos, setIpos] = useState<IPOData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<number | null>(null);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    await Promise.allSettled([
      fetch("/api/markets").then((r) => r.json()),
      fetch("/api/pipeline").then((r) => r.json()),
      fetch("/api/meetings").then((r) => r.json()),
      fetch("/api/news?region=india").then((r) => r.json()),
      fetch("/api/ipo").then((r) => r.json()),
    ]).then(([m, p, mt, n, ip]) => {
      if (m.status === "fulfilled") setMarkets(m.value);
      if (p.status === "fulfilled" && Array.isArray(p.value)) setPipeline(p.value);
      if (mt.status === "fulfilled" && Array.isArray(mt.value)) setMeetings(mt.value);
      if (n.status === "fulfilled") {
        const items = n.value?.items || (Array.isArray(n.value) ? n.value : []);
        setNews(items);
      }
      if (ip.status === "fulfilled") setIpos(ip.value);
      setLastRefreshed(Date.now());
    });

    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const upcomingMeetings = meetings
    .filter((m) => new Date(m.meetingDate) >= new Date(new Date().toDateString()))
    .sort((a, b) => new Date(a.meetingDate).getTime() - new Date(b.meetingDate).getTime())
    .slice(0, 5);

  const keyIndices = (markets?.indices || []).filter((i) =>
    ["^NSEI", "^BSESN", "^GSPC", "^DJI", "^IXIC", "^FTSE", "^N225", "^HSI"].includes(i.symbol)
  );

  const allMovers = (markets?.indices || []).filter((q) => q.changePercent != null);
  const topGainers = [...allMovers].sort((a, b) => (b.changePercent ?? 0) - (a.changePercent ?? 0)).slice(0, 5);
  const topLosers = [...allMovers].sort((a, b) => (a.changePercent ?? 0) - (b.changePercent ?? 0)).slice(0, 5);

  if (loading) {
    return (
      <div>
        <Header title="Terminal" />
        <div className="p-4 grid gap-3 grid-cols-12">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-40 col-span-3" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Terminal" />
      <div className="p-4 space-y-3">
        {/* Top strip: Refresh + status */}
        <div className="flex items-center justify-between bg-gradient-to-r from-pink-100 via-fuchsia-50 to-purple-100 rounded-xl px-4 py-2 border border-pink-200">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 text-pink-500 fill-pink-500" />
            <span className="text-sm font-bold gradient-text">Welcome back, babe</span>
            <span className="text-xs text-pink-600">— markets are open ✦</span>
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-pink-700 font-mono">⟳ {lastUpdatedLabel(lastRefreshed)}</span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-xs font-bold bg-gradient-to-r from-pink-500 to-fuchsia-500 text-white px-3 py-1 rounded-full shadow-sm hover:shadow-md transition-all disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-3 w-3 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {/* Key indices strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2">
          {keyIndices.map((q) => (
            <IndexCell key={q.symbol} q={q} />
          ))}
        </div>

        {/* Main Bloomberg grid: 12 columns */}
        <div className="grid grid-cols-12 gap-3">
          {/* LEFT: News feed */}
          <Card className="col-span-12 lg:col-span-5 overflow-hidden">
            <CardHeader className="pb-2 bg-gradient-to-r from-pink-100 to-fuchsia-50 border-b border-pink-200">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-bold text-pink-700 uppercase tracking-wider">
                  <Newspaper className="h-3.5 w-3.5" />
                  India Headlines
                </span>
                <Link href="/news" className="text-[10px] text-pink-600 hover:text-pink-800 font-semibold">
                  ALL NEWS →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0 max-h-[420px] overflow-y-auto">
              {news.length === 0 ? (
                <p className="p-4 text-xs text-muted-foreground">No news yet.</p>
              ) : (
                <div>
                  {news.slice(0, 12).map((item, i) => (
                    <a
                      key={i}
                      href={item.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-3 py-2 border-b border-pink-100 hover:bg-pink-50/60 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-[10px] font-mono text-pink-500 tabular-nums mt-0.5 shrink-0 w-8">
                          {timeAgo(item.publishedAt)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium line-clamp-2 text-foreground">{item.title}</p>
                          <p className="text-[10px] text-pink-600 mt-0.5">{item.source}</p>
                        </div>
                      </div>
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* CENTER: Top Gainers/Losers */}
          <div className="col-span-12 lg:col-span-4 space-y-3">
            <Card>
              <CardHeader className="pb-2 bg-gradient-to-r from-emerald-100 to-green-50 border-b border-emerald-200">
                <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-emerald-700 uppercase tracking-wider">
                  <Flame className="h-3.5 w-3.5" />
                  Top Gainers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                {topGainers.map((q) => <MoverRow key={q.symbol} q={q} />)}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 bg-gradient-to-r from-rose-100 to-pink-50 border-b border-rose-200">
                <CardTitle className="flex items-center gap-1.5 text-sm font-bold text-rose-700 uppercase tracking-wider">
                  <TrendingDown className="h-3.5 w-3.5" />
                  Top Losers
                </CardTitle>
              </CardHeader>
              <CardContent className="p-1">
                {topLosers.map((q) => <MoverRow key={q.symbol} q={q} />)}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT: Pipeline + Meetings */}
          <div className="col-span-12 lg:col-span-3 space-y-3">
            <Card>
              <CardHeader className="pb-2 bg-gradient-to-r from-purple-100 to-fuchsia-50 border-b border-purple-200">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-bold text-purple-700 uppercase tracking-wider">
                    <Kanban className="h-3.5 w-3.5" />
                    Pipeline
                  </span>
                  <Link href="/pipeline" className="text-[10px] text-purple-600 hover:text-purple-800 font-semibold">
                    →
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {pipeline.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No deals yet.</p>
                ) : (
                  <div className="space-y-1">
                    {PIPELINE_STAGES.map((stage) => {
                      const count = pipeline.filter((i) => i.stage === stage.id).length;
                      if (count === 0) return null;
                      return (
                        <div key={stage.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <div className={`w-1.5 h-1.5 rounded-full ${stage.color} shrink-0`} />
                            <span className="text-[11px] truncate">{stage.label}</span>
                          </div>
                          <Badge variant="secondary" className="h-4 text-[10px] px-1.5">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 bg-gradient-to-r from-pink-100 to-rose-50 border-b border-pink-200">
                <CardTitle className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-1.5 font-bold text-pink-700 uppercase tracking-wider">
                    <Calendar className="h-3.5 w-3.5" />
                    Meetings
                  </span>
                  <Link href="/meetings" className="text-[10px] text-pink-600 hover:text-pink-800 font-semibold">
                    →
                  </Link>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2">
                {upcomingMeetings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No upcoming.</p>
                ) : (
                  <div className="space-y-1">
                    {upcomingMeetings.map((m) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <span className="text-[11px] font-medium truncate">{m.companyName}</span>
                        <span className="text-[10px] text-pink-600 font-mono shrink-0 ml-1">
                          {new Date(m.meetingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Bottom row: IPOs + GMP */}
        <div className="grid grid-cols-12 gap-3">
          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2 bg-gradient-to-r from-fuchsia-100 to-pink-50 border-b border-fuchsia-200">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-bold text-fuchsia-700 uppercase tracking-wider">
                  <Rocket className="h-3.5 w-3.5" />
                  Upcoming IPOs
                </span>
                <Link href="/ipo" className="text-[10px] text-fuchsia-600 hover:text-fuchsia-800 font-semibold">
                  ALL →
                </Link>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!ipos?.upcoming?.length ? (
                <p className="p-3 text-xs text-muted-foreground">No IPO data available.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-pink-600 uppercase tracking-wider border-b border-pink-100">
                      <th className="text-left py-1.5 px-3 font-semibold">Company</th>
                      <th className="text-left py-1.5 px-3 font-semibold">Open</th>
                      <th className="text-center py-1.5 px-3 font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipos.upcoming.slice(0, 6).map((ipo, i) => (
                      <tr key={i} className="border-b border-pink-50 hover:bg-pink-50/40">
                        <td className="py-1.5 px-3 font-medium truncate max-w-[200px]">{ipo.company}</td>
                        <td className="py-1.5 px-3 text-pink-700 font-mono text-[11px]">{ipo.openDate || "—"}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold ${
                            ipo.status === "open" ? "bg-emerald-100 text-emerald-700" :
                            ipo.status === "upcoming" ? "bg-pink-100 text-pink-700" :
                            "bg-gray-100 text-gray-600"
                          }`}>
                            {ipo.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-12 lg:col-span-6">
            <CardHeader className="pb-2 bg-gradient-to-r from-purple-100 to-violet-50 border-b border-purple-200">
              <CardTitle className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-1.5 font-bold text-purple-700 uppercase tracking-wider">
                  <Star className="h-3.5 w-3.5" />
                  GMP Tracker
                </span>
                <span className="flex items-center gap-1 text-[10px] text-purple-600">
                  <Clock className="h-2.5 w-2.5" />
                  {markets?.fetchedAt ? lastUpdatedLabel(markets.fetchedAt) : ""}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {!ipos?.gmp?.length ? (
                <p className="p-3 text-xs text-muted-foreground">No GMP data available.</p>
              ) : (
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[10px] text-purple-600 uppercase tracking-wider border-b border-purple-100">
                      <th className="text-left py-1.5 px-3 font-semibold">Company</th>
                      <th className="text-right py-1.5 px-3 font-semibold">GMP</th>
                      <th className="text-right py-1.5 px-3 font-semibold">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ipos.gmp.slice(0, 6).map((ipo, i) => (
                      <tr key={i} className="border-b border-purple-50 hover:bg-purple-50/40">
                        <td className="py-1.5 px-3 font-medium truncate max-w-[200px]">{ipo.company}</td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          {ipo.gmp != null ? (
                            <span className={ipo.gmp >= 0 ? "text-emerald-600" : "text-rose-500"}>
                              ₹{ipo.gmp}
                            </span>
                          ) : "—"}
                        </td>
                        <td className="py-1.5 px-3 text-right font-mono">
                          {ipo.gmpPercent ? (
                            <span className={ipo.gmpPercent.startsWith("-") ? "text-rose-500" : "text-emerald-600"}>
                              {ipo.gmpPercent}
                            </span>
                          ) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
