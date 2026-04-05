import { prisma } from "@/lib/prisma";
import { yf } from "@/lib/fetchers/stocks";

export interface EarningsEvent {
  symbol: string;
  companyName: string;
  earningsDate: string | null;
  daysUntil: number | null;
  source: "watchlist" | "market";
}

const cache: { data: EarningsData | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

export interface EarningsData {
  watchlist: EarningsEvent[];
  upcoming: EarningsEvent[];
}

export async function fetchWatchlistEarnings(): Promise<EarningsEvent[]> {
  try {
    const stocks = await prisma.watchlistStock.findMany({
      select: { symbol: true, name: true },
    });

    if (stocks.length === 0) return [];

    const results = await Promise.allSettled(
      stocks.map(async (stock) => {
        try {
          const quote = await yf.quote(stock.symbol);
          const earningsTs = (quote as Record<string, unknown>).earningsTimestamp as number | Date | undefined
            || (quote as Record<string, unknown>).earningsTimestampStart as number | Date | undefined;

          let earningsDate: string | null = null;
          let daysUntil: number | null = null;

          if (earningsTs) {
            const date = earningsTs instanceof Date ? earningsTs : new Date(earningsTs * 1000);
            earningsDate = date.toISOString().split("T")[0];
            daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
          }

          return {
            symbol: stock.symbol,
            companyName: stock.name,
            earningsDate,
            daysUntil,
            source: "watchlist" as const,
          };
        } catch {
          return {
            symbol: stock.symbol,
            companyName: stock.name,
            earningsDate: null,
            daysUntil: null,
            source: "watchlist" as const,
          };
        }
      })
    );

    return results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<EarningsEvent>).value)
      .filter((e): e is EarningsEvent => e !== null && e.earningsDate !== null)
      .sort((a, b) => {
        if (!a.earningsDate || !b.earningsDate) return 0;
        return new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime();
      });
  } catch {
    return [];
  }
}

export async function fetchMarketEarnings(): Promise<EarningsEvent[]> {
  // Scrape upcoming Indian earnings from Money Control or similar
  try {
    const today = new Date();
    const nextMonth = new Date(today);
    nextMonth.setMonth(nextMonth.getMonth() + 1);

    // Use Yahoo Finance screener for Indian stocks with upcoming earnings
    // This is a best-effort approach — earnings calendar data is limited in free sources
    const popularIndianSymbols = [
      "RELIANCE.NS", "TCS.NS", "HDFCBANK.NS", "INFY.NS", "ICICIBANK.NS",
      "HINDUNILVR.NS", "BHARTIARTL.NS", "SBIN.NS", "ITC.NS", "BAJFINANCE.NS",
      "KOTAKBANK.NS", "LT.NS", "AXISBANK.NS", "ASIANPAINT.NS", "MARUTI.NS",
      "TITAN.NS", "SUNPHARMA.NS", "ULTRACEMCO.NS", "WIPRO.NS", "HCLTECH.NS",
    ];

    const results = await Promise.allSettled(
      popularIndianSymbols.map(async (symbol) => {
        try {
          const quote = await yf.quote(symbol);
          const earningsTs = (quote as Record<string, unknown>).earningsTimestamp as number | Date | undefined
            || (quote as Record<string, unknown>).earningsTimestampStart as number | Date | undefined;

          if (!earningsTs) return null;

          const date = earningsTs instanceof Date ? earningsTs : new Date(earningsTs * 1000);
          const earningsDate = date.toISOString().split("T")[0];
          const daysUntil = Math.ceil((date.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

          // Only include upcoming earnings (within next 90 days)
          if (daysUntil < -7 || daysUntil > 90) return null;

          return {
            symbol,
            companyName: quote.shortName || quote.longName || symbol.replace(".NS", ""),
            earningsDate,
            daysUntil,
            source: "market" as const,
          };
        } catch {
          return null;
        }
      })
    );

    return results
      .filter((r) => r.status === "fulfilled")
      .map((r) => (r as PromiseFulfilledResult<EarningsEvent | null>).value)
      .filter((e): e is EarningsEvent => e !== null)
      .sort((a, b) => {
        if (!a.earningsDate || !b.earningsDate) return 0;
        return new Date(a.earningsDate).getTime() - new Date(b.earningsDate).getTime();
      });
  } catch {
    return [];
  }
}

export async function fetchEarningsData(): Promise<EarningsData> {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const [watchlist, upcoming] = await Promise.all([
    fetchWatchlistEarnings(),
    fetchMarketEarnings(),
  ]);

  const data: EarningsData = { watchlist, upcoming };
  cache.data = data;
  cache.timestamp = Date.now();
  return data;
}
