import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

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
    const quote = await yf.quote(symbol);
    let summary: Record<string, unknown> | null = null;
    try {
      summary = await yf.quoteSummary(symbol, {
        modules: ["defaultKeyStatistics", "financialData", "incomeStatementHistory", "balanceSheetHistory"],
      }) as Record<string, unknown>;
    } catch {
      summary = null;
    }

    const financialData = (summary?.financialData ?? {}) as Record<string, number | undefined>;
    const keyStats = (summary?.defaultKeyStatistics ?? {}) as Record<string, number | undefined>;
    const incomeHistoryContainer = summary?.incomeStatementHistory as Record<string, unknown[]> | undefined;
    const incomeHistory = (incomeHistoryContainer?.incomeStatementHistory || []) as Record<string, number | undefined>[];
    const balanceHistoryContainer = summary?.balanceSheetHistory as Record<string, unknown[]> | undefined;
    const balanceHistory = (balanceHistoryContainer?.balanceSheetHistory || []) as Record<string, number | undefined>[];

    // ROE
    const roe = financialData.returnOnEquity != null
      ? (financialData.returnOnEquity as number) * 100
      : null;

    // ROCE = EBIT / (Total Assets - Current Liabilities)
    let roce: number | null = null;
    if (financialData.ebitda != null && balanceHistory.length > 0) {
      const latest = balanceHistory[0];
      const totalAssets = latest.totalAssets;
      const currentLiabilities = latest.totalCurrentLiabilities;
      if (totalAssets && currentLiabilities) {
        const capitalEmployed = totalAssets - currentLiabilities;
        if (capitalEmployed > 0) {
          roce = ((financialData.ebitda as number) / capitalEmployed) * 100;
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
      name: quote.shortName || quote.longName || symbol,
      price: quote.regularMarketPrice ?? null,
      pe: quote.trailingPE ?? keyStats.trailingPE ?? null,
      pb: keyStats.priceToBook ?? null,
      roe,
      roce,
      eps: quote.epsTrailingTwelveMonths ?? null,
      revenueGrowth3yr,
      patGrowth3yr,
    };
  } catch {
    return {
      symbol, name: symbol,
      price: null, pe: null, pb: null, roe: null,
      roce: null, eps: null, revenueGrowth3yr: null, patGrowth3yr: null,
    };
  }
}

export async function searchStocks(query: string): Promise<SearchResult[]> {
  if (!query || query.length < 2) return [];
  try {
    const results = await yf.search(query);
    return (results.quotes || [])
      .filter((q: Record<string, unknown>) => {
        const s = String(q.symbol || "");
        return s.endsWith(".NS") || s.endsWith(".BO");
      })
      .slice(0, 10)
      .map((q: Record<string, unknown>) => ({
        symbol: String(q.symbol || ""),
        name: String(q.shortname || q.longname || q.symbol || ""),
        exchange: String(q.exchange || ""),
      }));
  } catch {
    return [];
  }
}

export { yf };
