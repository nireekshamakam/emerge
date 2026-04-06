"use client";

import { Header } from "@/components/layout/Header";
import { useState, useEffect, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ExternalLink, Clock, RefreshCw } from "lucide-react";
import Link from "next/link";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  description: string;
  stockName?: string;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function lastUpdatedLabel(ts: number | null): string {
  if (!ts) return "";
  const diff = Date.now() - ts;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Updated just now";
  if (mins < 60) return `Updated ${mins}m ago`;
  return `Updated ${Math.floor(mins / 60)}h ago`;
}

function NewsCard({ item }: { item: NewsItem }) {
  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {item.stockName && (
              <Badge variant="outline" className="mb-1.5 text-xs">{item.stockName}</Badge>
            )}
            <a
              href={item.link}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-medium hover:text-primary transition-colors line-clamp-2 block"
            >
              {item.title}
            </a>
            {item.description && (
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                {item.description}
              </p>
            )}
            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
              <span className="font-medium text-primary/80">{item.source}</span>
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {timeAgo(item.publishedAt)}
              </span>
            </div>
          </div>
          <a
            href={item.link}
            target="_blank"
            rel="noopener noreferrer"
            className="shrink-0 text-muted-foreground hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}

export default function NewsPage() {
  const [tab, setTab] = useState("global");
  const [news, setNews] = useState<NewsItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNews = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const url = tab === "portfolio" ? "/api/news/portfolio" : `/api/news?region=${tab}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data.items) {
        setNews(Array.isArray(data.items) ? data.items : []);
        setFetchedAt(data.fetchedAt ?? null);
      } else {
        setNews(Array.isArray(data) ? data : []);
      }
    } catch {
      setNews([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => { fetchNews(); }, [fetchNews]);

  return (
    <div>
      <Header title="Market News" />
      <div className="p-6">
        <Tabs value={tab} onValueChange={setTab}>
          <div className="flex items-center justify-between mb-3">
            <TabsList>
              <TabsTrigger value="global">Global</TabsTrigger>
              <TabsTrigger value="india">India</TabsTrigger>
              <TabsTrigger value="portfolio">Portfolio</TabsTrigger>
            </TabsList>
            <div className="flex items-center gap-3">
              {fetchedAt && (
                <span className="text-xs text-muted-foreground">{lastUpdatedLabel(fetchedAt)}</span>
              )}
              <button
                onClick={() => fetchNews(true)}
                disabled={refreshing}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
                Refresh
              </button>
            </div>
          </div>

          <TabsContent value={tab}>
            {loading ? (
              <div className="space-y-4 mt-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-24 w-full" />
                ))}
              </div>
            ) : news.length === 0 ? (
              <div className="mt-8 text-center">
                {tab === "portfolio" ? (
                  <div>
                    <p className="text-muted-foreground">No portfolio news available.</p>
                    <p className="text-sm text-muted-foreground mt-2">
                      <Link href="/stocks" className="text-primary hover:underline">
                        Add stocks to your watchlist
                      </Link>{" "}
                      to see company-specific news here.
                    </p>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No news available. Try again later.</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 mt-4">
                {news.map((item, i) => (
                  <NewsCard key={i} item={item} />
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
