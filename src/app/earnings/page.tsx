"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CalendarDays, Clock } from "lucide-react";

interface EarningsEvent {
  symbol: string;
  companyName: string;
  earningsDate: string | null;
  daysUntil: number | null;
  source: "watchlist" | "market";
}

interface EarningsData {
  watchlist: EarningsEvent[];
  upcoming: EarningsEvent[];
}

function DaysUntilBadge({ days }: { days: number | null }) {
  if (days == null) return <Badge variant="secondary">TBD</Badge>;
  if (days === 0) return <Badge className="bg-amber-100 text-amber-700">Today</Badge>;
  if (days < 0) return <Badge variant="secondary">{Math.abs(days)}d ago</Badge>;
  if (days <= 7) return <Badge className="bg-emerald-100 text-emerald-700">In {days}d</Badge>;
  return <Badge variant="outline">{days}d away</Badge>;
}

function EarningsCard({ event }: { event: EarningsEvent }) {
  return (
    <div className="flex items-center justify-between p-3 rounded-md border hover:bg-accent/20 transition-colors">
      <div>
        <h4 className="text-sm font-medium">{event.companyName}</h4>
        <span className="text-xs text-muted-foreground">{event.symbol}</span>
      </div>
      <div className="flex items-center gap-3">
        {event.earningsDate && (
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <CalendarDays className="h-3 w-3" />
            {new Date(event.earningsDate).toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </span>
        )}
        <DaysUntilBadge days={event.daysUntil} />
      </div>
    </div>
  );
}

export default function EarningsPage() {
  const [data, setData] = useState<EarningsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/earnings")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <Header title="Earnings Calendar" />
        <div className="p-6 space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div>
      <Header title="Earnings Calendar" />
      <div className="p-6 space-y-6">
        {/* Watchlist Earnings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Clock className="h-4 w-4" />
              My Watchlist — Upcoming Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.watchlist?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No earnings dates found for your watchlist stocks. Add stocks to your watchlist to track their earnings.
              </p>
            ) : (
              <div className="space-y-2">
                {data.watchlist.map((event, i) => (
                  <EarningsCard key={i} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Market Earnings */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Nifty 50 — Upcoming Earnings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!data?.upcoming?.length ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No upcoming earnings dates available.
              </p>
            ) : (
              <div className="space-y-2">
                {data.upcoming.map((event, i) => (
                  <EarningsCard key={i} event={event} />
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
