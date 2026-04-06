"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatNumber, formatPercent, changeColor } from "@/lib/utils";
import { PIPELINE_STAGES } from "@/lib/constants";
import Link from "next/link";
import {
  TrendingUp,
  Newspaper,
  BarChart3,
  Users,
  Kanban,
  ArrowRight,
  Calendar,
  RefreshCw,
} from "lucide-react";

interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
}

interface MarketData {
  indices: MarketQuote[];
  fetchedAt?: number;
}

interface PipelineItem {
  id: string;
  stage: string;
}

interface Meeting {
  id: string;
  companyName: string;
  meetingDate: string;
  city: string | null;
}

function lastUpdatedLabel(ts: number | null | undefined): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  return `${Math.floor(mins / 60)}h ago`;
}

function SectionLink({ href, icon, title }: { href: string; icon: React.ReactNode; title: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors group">
      {icon}
      <span>{title}</span>
      <ArrowRight className="h-3 w-3 opacity-0 group-hover:opacity-100 transition-opacity" />
    </Link>
  );
}

export default function DashboardPage() {
  const [markets, setMarkets] = useState<MarketData | null>(null);
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
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
    ]).then(([m, p, mt]) => {
      if (m.status === "fulfilled") setMarkets(m.value);
      if (p.status === "fulfilled" && Array.isArray(p.value)) setPipeline(p.value);
      if (mt.status === "fulfilled" && Array.isArray(mt.value)) setMeetings(mt.value);
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

  const keyIndices = markets?.indices?.filter((i) =>
    ["^NSEI", "^BSESN", "^GSPC", "^DJI", "^FTSE", "^N225"].includes(i.symbol)
  ) || [];

  return (
    <div>
      <Header title="Dashboard" />
      <div className="p-6 space-y-6">
        {/* Quick nav */}
        <div className="flex flex-wrap gap-6 items-center justify-between">
          <div className="flex flex-wrap gap-6">
            <SectionLink href="/news" icon={<Newspaper className="h-4 w-4" />} title="Market News" />
            <SectionLink href="/markets" icon={<TrendingUp className="h-4 w-4" />} title="Markets" />
            <SectionLink href="/stocks" icon={<BarChart3 className="h-4 w-4" />} title="Stock Dashboard" />
            <SectionLink href="/meetings" icon={<Users className="h-4 w-4" />} title="Meetings" />
            <SectionLink href="/pipeline" icon={<Kanban className="h-4 w-4" />} title="Pipeline" />
          </div>
          <div className="flex items-center gap-3">
            {lastRefreshed && (
              <span className="text-xs text-muted-foreground">Updated {lastUpdatedLabel(lastRefreshed)}</span>
            )}
            <button
              onClick={() => load(true)}
              disabled={refreshing}
              className="flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`} />
              Refresh
            </button>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-48" />
            ))}
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Market Snapshot */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between text-base">
                  <span className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4" />
                    Market Snapshot
                  </span>
                  {markets?.fetchedAt && (
                    <span className="text-xs font-normal text-muted-foreground">
                      {lastUpdatedLabel(markets.fetchedAt)}
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {keyIndices.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Market data unavailable.</p>
                ) : (
                  <div className="space-y-2">
                    {keyIndices.map((idx) => (
                      <div key={idx.symbol} className="flex items-center justify-between">
                        <span className="text-sm">{idx.name}</span>
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-mono tabular-nums">{formatNumber(idx.price)}</span>
                          <span className={`text-xs font-mono tabular-nums ${changeColor(idx.changePercent)}`}>
                            {formatPercent(idx.changePercent)}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/markets" className="text-xs text-primary hover:underline mt-3 inline-block">
                  View all markets →
                </Link>
              </CardContent>
            </Card>

            {/* Pipeline Summary */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Kanban className="h-4 w-4" />
                  Pipeline
                </CardTitle>
              </CardHeader>
              <CardContent>
                {pipeline.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No deals in pipeline.</p>
                ) : (
                  <div className="space-y-2">
                    {PIPELINE_STAGES.map((stage) => {
                      const count = pipeline.filter((i) => i.stage === stage.id).length;
                      if (count === 0) return null;
                      return (
                        <div key={stage.id} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${stage.color}`} />
                            <span className="text-sm">{stage.label}</span>
                          </div>
                          <Badge variant="secondary">{count}</Badge>
                        </div>
                      );
                    })}
                  </div>
                )}
                <Link href="/pipeline" className="text-xs text-primary hover:underline mt-3 inline-block">
                  View pipeline →
                </Link>
              </CardContent>
            </Card>

            {/* Upcoming Meetings */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Calendar className="h-4 w-4" />
                  Upcoming Meetings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingMeetings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No upcoming meetings.</p>
                ) : (
                  <div className="space-y-2">
                    {upcomingMeetings.map((m) => (
                      <div key={m.id} className="flex items-center justify-between">
                        <div>
                          <span className="text-sm font-medium">{m.companyName}</span>
                          {m.city && <span className="text-xs text-muted-foreground ml-2">{m.city}</span>}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(m.meetingDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                <Link href="/meetings" className="text-xs text-primary hover:underline mt-3 inline-block">
                  View all meetings →
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
