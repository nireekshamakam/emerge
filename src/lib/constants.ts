export const PIPELINE_STAGES = [
  { id: "SCREENING", label: "Screening", color: "bg-slate-500" },
  { id: "RESEARCH", label: "Research", color: "bg-blue-500" },
  { id: "DUE_DILIGENCE", label: "Due Diligence", color: "bg-amber-500" },
  { id: "INVESTMENT_COMMITTEE", label: "Investment Committee", color: "bg-purple-500" },
  { id: "INVESTED", label: "Invested", color: "bg-emerald-500" },
  { id: "MONITORING", label: "Monitoring", color: "bg-cyan-500" },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]["id"];

export const MARKET_INDICES = [
  // Americas
  { symbol: "^GSPC", name: "S&P 500", country: "USA", region: "Americas" },
  { symbol: "^DJI", name: "Dow Jones", country: "USA", region: "Americas" },
  { symbol: "^IXIC", name: "Nasdaq", country: "USA", region: "Americas" },
  // Europe
  { symbol: "^FTSE", name: "FTSE 100", country: "UK", region: "Europe" },
  { symbol: "^GDAXI", name: "DAX", country: "Germany", region: "Europe" },
  { symbol: "^FCHI", name: "CAC 40", country: "France", region: "Europe" },
  { symbol: "^STOXX50E", name: "Euro Stoxx 50", country: "Europe", region: "Europe" },
  // Asia-Pacific
  { symbol: "^N225", name: "Nikkei 225", country: "Japan", region: "Asia-Pacific" },
  { symbol: "^HSI", name: "Hang Seng", country: "Hong Kong", region: "Asia-Pacific" },
  { symbol: "000001.SS", name: "Shanghai Comp.", country: "China", region: "Asia-Pacific" },
  { symbol: "^KS11", name: "KOSPI", country: "South Korea", region: "Asia-Pacific" },
  { symbol: "^NSEI", name: "Nifty 50", country: "India", region: "Asia-Pacific" },
  { symbol: "^BSESN", name: "Sensex", country: "India", region: "Asia-Pacific" },
  { symbol: "^STI", name: "Straits Times", country: "Singapore", region: "Asia-Pacific" },
] as const;

export const COMMODITIES = [
  { symbol: "GC=F", name: "Gold", category: "Precious Metals" },
  { symbol: "SI=F", name: "Silver", category: "Precious Metals" },
  { symbol: "BZ=F", name: "Brent Crude", category: "Energy" },
  { symbol: "CL=F", name: "WTI Crude", category: "Energy" },
  { symbol: "NG=F", name: "Natural Gas", category: "Energy" },
] as const;

export const BONDS_AND_RATES = [
  { symbol: "^TNX", name: "US 10Y Treasury", category: "Bonds" },
  { symbol: "^TYX", name: "US 30Y Treasury", category: "Bonds" },
  { symbol: "^IRX", name: "US 13W T-Bill", category: "Bonds" },
] as const;

export const CURRENCIES = [
  { symbol: "USDINR=X", name: "USD/INR" },
  { symbol: "EURUSD=X", name: "EUR/USD" },
  { symbol: "GBPUSD=X", name: "GBP/USD" },
  { symbol: "USDJPY=X", name: "USD/JPY" },
  { symbol: "USDCNY=X", name: "USD/CNY" },
] as const;

export const RSS_FEEDS = {
  global: [
    {
      url: "https://news.google.com/rss/search?q=stock+market+economy&hl=en&gl=US&ceid=US:en",
      source: "Google News",
    },
  ],
  india: [
    {
      url: "https://news.google.com/rss/search?q=indian+stock+market+NSE+BSE&hl=en-IN&gl=IN&ceid=IN:en",
      source: "Google News India",
    },
    {
      url: "https://economictimes.indiatimes.com/rssfeedstopstories.cms",
      source: "Economic Times",
    },
  ],
} as const;

export const STOCK_METRICS = [
  { key: "price", label: "Price", format: "currency" },
  { key: "pe", label: "PE", format: "number" },
  { key: "pb", label: "PB", format: "number" },
  { key: "roe", label: "ROE %", format: "percent" },
  { key: "roce", label: "ROCE %", format: "percent" },
  { key: "eps", label: "EPS", format: "currency" },
  { key: "revenueGrowth3yr", label: "3Y Rev Growth", format: "percent" },
  { key: "patGrowth3yr", label: "3Y PAT Growth", format: "percent" },
] as const;
