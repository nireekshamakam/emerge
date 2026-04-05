import YahooFinance from "yahoo-finance2";
import { MARKET_INDICES, COMMODITIES, BONDS_AND_RATES, CURRENCIES } from "@/lib/constants";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

export interface MarketQuote {
  symbol: string;
  name: string;
  price: number | null;
  change: number | null;
  changePercent: number | null;
  region?: string;
  country?: string;
  category?: string;
}

const cache: { data: MarketData | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 60 * 1000;

export interface MarketData {
  indices: MarketQuote[];
  commodities: MarketQuote[];
  bonds: MarketQuote[];
  currencies: MarketQuote[];
}

async function fetchQuote(symbol: string): Promise<{
  regularMarketPrice?: number;
  regularMarketChange?: number;
  regularMarketChangePercent?: number;
} | null> {
  try {
    const quote = await yf.quote(symbol);
    return {
      regularMarketPrice: quote.regularMarketPrice,
      regularMarketChange: quote.regularMarketChange,
      regularMarketChangePercent: quote.regularMarketChangePercent,
    };
  } catch {
    return null;
  }
}

export async function fetchMarketData(): Promise<MarketData> {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const [indexQuotes, commodityQuotes, bondQuotes, currencyQuotes] = await Promise.all([
    Promise.all(
      MARKET_INDICES.map(async (idx) => {
        const q = await fetchQuote(idx.symbol);
        return {
          symbol: idx.symbol,
          name: idx.name,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
          region: idx.region,
          country: idx.country,
        };
      })
    ),
    Promise.all(
      COMMODITIES.map(async (c) => {
        const q = await fetchQuote(c.symbol);
        return {
          symbol: c.symbol,
          name: c.name,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
          category: c.category,
        };
      })
    ),
    Promise.all(
      BONDS_AND_RATES.map(async (b) => {
        const q = await fetchQuote(b.symbol);
        return {
          symbol: b.symbol,
          name: b.name,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
          category: b.category,
        };
      })
    ),
    Promise.all(
      CURRENCIES.map(async (c) => {
        const q = await fetchQuote(c.symbol);
        return {
          symbol: c.symbol,
          name: c.name,
          price: q?.regularMarketPrice ?? null,
          change: q?.regularMarketChange ?? null,
          changePercent: q?.regularMarketChangePercent ?? null,
        };
      })
    ),
  ]);

  const data: MarketData = {
    indices: indexQuotes,
    commodities: commodityQuotes,
    bonds: bondQuotes,
    currencies: currencyQuotes,
  };

  cache.data = data;
  cache.timestamp = Date.now();
  return data;
}
