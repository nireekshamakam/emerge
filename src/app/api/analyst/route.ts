import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import YahooFinance from "yahoo-finance2";

const yf = new YahooFinance({ suppressNotices: ["yahooSurvey"] });

function fmt(v: unknown, suffix = ""): string {
  if (v == null) return "N/A";
  if (typeof v === "number") {
    if (Math.abs(v) >= 1e9) return `${(v / 1e9).toFixed(2)}B${suffix}`;
    if (Math.abs(v) >= 1e7) return `${(v / 1e7).toFixed(2)}Cr${suffix}`;
    if (Math.abs(v) >= 1e5) return `${(v / 1e5).toFixed(2)}L${suffix}`;
    return `${v.toFixed(2)}${suffix}`;
  }
  return String(v);
}

function pct(v: unknown): string {
  if (v == null) return "N/A";
  if (typeof v === "number") return `${(v * 100).toFixed(2)}%`;
  return String(v);
}

export async function POST(req: NextRequest) {
  try {
    const { symbol } = await req.json();
    if (!symbol || typeof symbol !== "string") {
      return NextResponse.json({ error: "Symbol required" }, { status: 400 });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "ANTHROPIC_API_KEY not configured" }, { status: 500 });
    }

    // Fetch comprehensive data from Yahoo Finance
    let quote: Record<string, unknown> = {};
    let summary: Record<string, unknown> = {};

    try {
      quote = await yf.quote(symbol) as Record<string, unknown>;
    } catch { /* continue */ }

    try {
      summary = await yf.quoteSummary(symbol, {
        modules: [
          "assetProfile",
          "defaultKeyStatistics",
          "financialData",
          "incomeStatementHistory",
          "balanceSheetHistory",
          "cashflowStatementHistory",
          "earningsTrend",
          "recommendationTrend",
        ],
      }) as Record<string, unknown>;
    } catch { /* continue */ }

    const profile = (summary.assetProfile || {}) as Record<string, unknown>;
    const keyStats = (summary.defaultKeyStatistics || {}) as Record<string, unknown>;
    const finData = (summary.financialData || {}) as Record<string, unknown>;
    const incomeHistory = ((summary.incomeStatementHistory as Record<string, unknown[]> | undefined)?.incomeStatementHistory || []) as Record<string, unknown>[];
    const balanceHistory = ((summary.balanceSheetHistory as Record<string, unknown[]> | undefined)?.balanceSheetHistory || []) as Record<string, unknown>[];
    const cashflowHistory = ((summary.cashflowStatementHistory as Record<string, unknown[]> | undefined)?.cashflowStatementHistory || []) as Record<string, unknown>[];
    const recTrend = ((summary.recommendationTrend as Record<string, unknown[]> | undefined)?.trend || []) as Record<string, unknown>[];

    const companyName = String(quote.shortName || quote.longName || symbol);

    // Build structured data string for the prompt
    const dataBlock = `
COMPANY: ${companyName} (${symbol})
SECTOR: ${String(profile.sector || "N/A")} | INDUSTRY: ${String(profile.industry || "N/A")}
DESCRIPTION: ${String(profile.longBusinessSummary || "N/A").slice(0, 500)}

--- VALUATION ---
Market Cap: ${fmt(quote.marketCap)}
Share Price: ₹${fmt(quote.regularMarketPrice)} (52W High: ₹${fmt(quote.fiftyTwoWeekHigh)}, Low: ₹${fmt(quote.fiftyTwoWeekLow)})
P/E (Trailing): ${fmt(quote.trailingPE ?? keyStats.trailingPE)}
P/E (Forward): ${fmt(keyStats.forwardPE)}
P/B: ${fmt(keyStats.priceToBook)}
EV/EBITDA: ${fmt(keyStats.enterpriseToEbitda)}
P/S: ${fmt(keyStats.priceToSalesTrailing12Months)}
EPS (TTM): ₹${fmt(keyStats.trailingEps)}

--- PROFITABILITY ---
Revenue (TTM): ${fmt(finData.totalRevenue)}
Gross Profit Margin: ${pct(finData.grossMargins)}
EBITDA Margin: ${pct(finData.ebitdaMargins)}
Operating Margin: ${pct(finData.operatingMargins)}
Net Profit Margin: ${pct(finData.profitMargins)}
ROE: ${pct(finData.returnOnEquity)}
ROA: ${pct(finData.returnOnAssets)}

--- FINANCIAL HEALTH ---
Total Debt: ${fmt(finData.totalDebt)}
Total Cash: ${fmt(finData.totalCash)}
Debt/Equity: ${fmt(finData.debtToEquity)}
Current Ratio: ${fmt(finData.currentRatio)}
Quick Ratio: ${fmt(finData.quickRatio)}
Free Cash Flow: ${fmt(finData.freeCashflow)}

--- INCOME STATEMENT (Last 4 Years) ---
${incomeHistory.slice(0, 4).map((y, i) => `FY-${i}: Revenue ${fmt(y.totalRevenue)}, Net Income ${fmt(y.netIncome)}, EBITDA ${fmt(y.ebitda)}`).join("\n") || "N/A"}

--- BALANCE SHEET (Latest) ---
Total Assets: ${fmt(balanceHistory[0]?.totalAssets)}
Total Liabilities: ${fmt(balanceHistory[0]?.totalLiab)}
Stockholder Equity: ${fmt(balanceHistory[0]?.totalStockholderEquity)}
Current Assets: ${fmt(balanceHistory[0]?.totalCurrentAssets)}
Current Liabilities: ${fmt(balanceHistory[0]?.totalCurrentLiabilities)}

--- CASH FLOW (Latest) ---
Operating CF: ${fmt(cashflowHistory[0]?.totalCashFromOperatingActivities)}
Capex: ${fmt(cashflowHistory[0]?.capitalExpenditures)}
Free CF: ${fmt(cashflowHistory[0]?.freeCashFlow)}

--- ANALYST RECOMMENDATIONS ---
${recTrend.slice(0, 2).map((t) => {
  const r = t as Record<string, number | undefined>;
  return `Period ${r.period}: Strong Buy ${r.strongBuy ?? 0}, Buy ${r.buy ?? 0}, Hold ${r.hold ?? 0}, Sell ${r.sell ?? 0}, Strong Sell ${r.strongSell ?? 0}`;
}).join("\n") || "N/A"}
Target Price: ₹${fmt(finData.targetMeanPrice)} (Low: ₹${fmt(finData.targetLowPrice)}, High: ₹${fmt(finData.targetHighPrice)})
`.trim();

    const client = new Anthropic({ apiKey });

    const message = await client.messages.create({
      model: "claude-opus-4-6",
      max_tokens: 2000,
      messages: [
        {
          role: "user",
          content: `You are a senior equity research analyst specializing in Indian markets. Analyze the following stock data and produce a comprehensive fundamental analysis report.

${dataBlock}

Write a structured report with these sections:
1. **Business Overview** – What the company does, competitive position, key segments
2. **Financial Performance** – Revenue/profit trends, margin analysis, growth trajectory
3. **Balance Sheet & Financial Health** – Debt levels, liquidity, capital efficiency
4. **Valuation Assessment** – Is the stock cheap, fair, or expensive? Justify using multiples
5. **Key Risks** – Sector risks, company-specific risks, macro risks
6. **Investment Thesis** – Bull case vs Bear case
7. **Analyst Verdict** – Rating (Strong Buy / Buy / Hold / Sell / Strong Sell) with a 1-paragraph rationale

Be specific, data-driven, and concise. Reference the actual numbers from the data provided.`,
        },
      ],
    });

    const analysis = message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      symbol,
      companyName,
      analysis,
      dataSnapshot: {
        price: quote.regularMarketPrice ?? null,
        marketCap: quote.marketCap ?? null,
        pe: quote.trailingPE ?? keyStats.trailingPE ?? null,
        pb: keyStats.priceToBook ?? null,
        roe: finData.returnOnEquity ?? null,
        netMargin: finData.profitMargins ?? null,
      },
      generatedAt: Date.now(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
