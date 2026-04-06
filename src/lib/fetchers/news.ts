import { XMLParser } from "fast-xml-parser";
import { RSS_FEEDS } from "@/lib/constants";

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  description: string;
  stockName?: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
}

export function parseRss(xml: string, sourceName: string): NewsItem[] {
  try {
    const parsed = parser.parse(xml);
    const channel = parsed?.rss?.channel;
    if (!channel) return [];

    const items: RssItem[] = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];

    return items.slice(0, 20).map((item) => ({
      title: String(item.title || ""),
      link: String(item.link || ""),
      source: typeof item.source === "object" ? String(item.source["#text"] || sourceName) : sourceName,
      publishedAt: item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString(),
      description: String(item.description || "").replace(/<[^>]*>/g, "").slice(0, 200),
    }));
  } catch {
    return [];
  }
}

const cache = new Map<string, { data: NewsItem[]; fetchedAt: number; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export interface NewsResponse {
  items: NewsItem[];
  fetchedAt: number;
}

export async function fetchNews(region: "global" | "india"): Promise<NewsResponse> {
  const cacheKey = region;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { items: cached.data, fetchedAt: cached.fetchedAt };
  }

  const feeds = RSS_FEEDS[region];
  const results = await Promise.allSettled(
    feeds.map(async (feed) => {
      const res = await fetch(feed.url, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      const xml = await res.text();
      return parseRss(xml, feed.source);
    })
  );

  const allNews = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<NewsItem[]>).value)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const fetchedAt = Date.now();
  cache.set(cacheKey, { data: allNews, fetchedAt, timestamp: fetchedAt });
  return { items: allNews, fetchedAt };
}

export async function fetchPortfolioNews(
  stocks: { symbol: string; name: string }[]
): Promise<NewsResponse> {
  const cacheKey = "portfolio";
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return { items: cached.data, fetchedAt: cached.fetchedAt };
  }

  // Limit to 10 stocks to avoid too many requests
  const limitedStocks = stocks.slice(0, 10);

  const results = await Promise.allSettled(
    limitedStocks.map(async (stock) => {
      // Clean company name: remove .NS/.BO suffix and common suffixes
      const cleanName = stock.name.replace(/\s*(Ltd\.?|Limited|Inc\.?|Corp\.?)$/i, "").trim();
      const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(cleanName + " stock")}&hl=en-IN&gl=IN&ceid=IN:en`;

      const res = await fetch(rssUrl, {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(10000),
      });
      const xml = await res.text();
      const items = parseRss(xml, "Google News");
      return items.slice(0, 5).map((item) => ({ ...item, stockName: stock.name }));
    })
  );

  const allNews = results
    .filter((r) => r.status === "fulfilled")
    .flatMap((r) => (r as PromiseFulfilledResult<NewsItem[]>).value)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  const fetchedAt = Date.now();
  cache.set(cacheKey, { data: allNews, fetchedAt, timestamp: fetchedAt });
  return { items: allNews, fetchedAt };
}
