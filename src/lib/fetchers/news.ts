import { XMLParser } from "fast-xml-parser";
import { RSS_FEEDS } from "@/lib/constants";

export interface NewsItem {
  title: string;
  link: string;
  source: string;
  publishedAt: string;
  description: string;
}

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });

interface RssItem {
  title?: string;
  link?: string;
  pubDate?: string;
  description?: string;
  source?: string | { "#text"?: string };
}

function parseRss(xml: string, sourceName: string): NewsItem[] {
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

const cache = new Map<string, { data: NewsItem[]; timestamp: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function fetchNews(region: "global" | "india"): Promise<NewsItem[]> {
  const cacheKey = region;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
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
    .filter((r): r is PromiseFulfilledResult<NewsItem[]> => r.status === "fulfilled")
    .flatMap((r) => r.value)
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());

  cache.set(cacheKey, { data: allNews, timestamp: Date.now() });
  return allNews;
}
