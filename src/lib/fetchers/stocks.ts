import yahooFinance from "yahoo-finance2";

export interface StockMetrics {
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

export interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
}

function computeCAGR(startValue: number, endValue: number, years: number): number | null {
  if (startValue <= 0 || endValue <= 0 || years <= 0) return null;
  return (Math.pow(endValue / startValue, 1 / years) - 1) * 100;
}

export async function fetchStockMetrics(symbol: string): Promise<StockMetrics> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const yf = yahooFinance as any;
    const rawQuote = await yf.quote(symbol) as Record<string, unknown>;
    let rawSummary: Record<string, Record<string, unknown>> | null = null;
    try {
      rawSummary = await yf.quoteSummary(symbol, {
        modules: ["defaultKeyStatistics", "financialData", "incomeStatementHistory", "balanceSheetHistory"],
      }) as Record<string, Record<string, unknown>>;
    } catch {
      rawSummary = null;
    }

    const financialData = rawSummary?.financialData as Record<string, number | undefined> | undefined;
    const keyStats = rawSummary?.defaultKeyStatistics as Record<string, number | undefined> | undefined;
    const incomeHistoryContainer = rawSummary?.incomeStatementHistory as Record<string, unknown[]> | undefined;
    const incomeHistory = (incomeHistoryContainer?.incomeStatementHistory || []) as Record<string, number | undefined>[];
    const balanceHistoryContainer = rawSummary?.balanceSheetHistory as Record<string, unknown[]> | undefined;
    const balanceHistory = (balanceHistoryContainer?.balanceSheetHistory || []) as Record<string, number | undefined>[];

    // ROE
    const roe = financialData?.returnOnEquity != null
      ? (financialData.returnOnEquity as number) * 100
      : null;

    // ROCE = EBIT / (Total Assets - Current Liabilities)
    let roce: number | null = null;
    if (financialData?.ebitda != null && balanceHistory.length > 0) {
      const latest = balanceHistory[0];
      const totalAssets = latest.totalAssets;
      const currentLiabilities = latest.totalCurrentLiabilities;
      if (totalAssets && currentLiabilities) {
        const capitalEmployed = totalAssets - currentLiabilities;
        if (capitalEmployed > 0) {
          const ebit = financialData.ebitda as number;
          roce = (ebit / capitalEmployed) * 100;
        }
      }
    }

    // 3-Year Revenue Growth (CAGR)
    let revenueGrowth3yr: number | null = null;
    if (incomeHistory.length >= 4) {
      const recentRevenue = incomeHistory[0].totalRevenue;
      const olderRevenue = incomeHistory[3].totalRevenue;
      if (recentRevenue && olderRevenue) {
        revenueGrowth3yr = computeCAGR(olderRevenue, recentRevenue, 3);
      }
    }

    // 3-Year PAT Growth (CAGR)
    let patGrowth3yr: number | null = null;
    if (incomeHistory.length >= 4) {
      const recentPAT = incomeHistory[0].netIncome;
      const olderPAT = incomeHistory[3].netIncome;
      if (recentPAT && olderPAT) {
        patGrowth3yr = computeCAGR(olderPAT, recentPAT, 3);
      }
    }

    return {
      symbol,
      name: (rawQuote.shortName as string) || (rawQuote.longName as string) || symbol,
      price: (rawQuote.regularMarketPrice as number) ?? null,
      pe: (rawQuote.trailingPE as number) ?? keyStats?.trailingPE ?? null,
      pb: keyStats?.priceToBook ?? null,
      roe,
      roce,
      eps: (rawQuote.epsTrailingTwelveMonths as number) ?? null,
      revenueGrowth3yr,
      patGrowth3yr,
    };
  } catch {
    return {
      symbol,
      name: symbol,
      price: null,
      pe: null,
      pb: null,
      roe: null,
      roce: null,
      eps: null,
      revenueGrowth3yr: null,
      patGrowth3yr: null,
    };
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const results = await (yahooFinance as any).search(query) as Record<string, unknown>;
    const quotes = (results.quotes || []) as Record<string, string>[];
    return quotes
      .filter((q) => {
        const s = q.symbol || "";
        return s.endsWith(".NS") || s.endsWith(".BO");
      })
      .slice(0, 10)
      .map((q) => ({
        symbol: q.symbol || "",
        name: q.shortname || q.longname || q.symbol || "",
        exchange: q.exchange || "",
      }));
  } catch {
    return [];
  }
}
