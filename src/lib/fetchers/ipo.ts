import * as cheerio from "cheerio";

export interface IPOItem {
  company: string;
  openDate: string;
  closeDate: string;
  listingDate: string | null;
  priceBand: string;
  lotSize: string;
  issueSize: string;
  status: "upcoming" | "open" | "listed";
  listingPrice: number | null;
  listingGain: string | null;
  gmp: number | null;
  gmpPercent: string | null;
}

export interface IPOData {
  upcoming: IPOItem[];
  recent: IPOItem[];
  gmp: IPOItem[];
}

const cache: { data: IPOData | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml",
    },
    signal: AbortSignal.timeout(15000),
  });
  return res.text();
}

async function scrapeUpcomingIPOs(): Promise<IPOItem[]> {
  try {
    const html = await fetchPage("https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-702/1/");
    const $ = cheerio.load(html);
    const items: IPOItem[] = [];

    $("table.table tbody tr").each((_, row) => {
      const cols = $(row).find("td");
      if (cols.length >= 5) {
        const company = $(cols[0]).text().trim();
        const dates = $(cols[1]).text().trim();
        const issueSize = $(cols[2]).text().trim();
        const priceBand = $(cols[3]).text().trim();

        if (!company || company.toLowerCase().includes("no data")) return;

        // Parse dates like "Apr 10, 2026 - Apr 14, 2026"
        const dateParts = dates.split(/\s*[-–]\s*/);
        const openDate = dateParts[0]?.trim() || "";
        const closeDate = dateParts[1]?.trim() || "";

        const now = new Date();
        const open = openDate ? new Date(openDate) : null;
        const close = closeDate ? new Date(closeDate) : null;

        let status: "upcoming" | "open" | "listed" = "upcoming";
        if (open && close) {
          if (now >= open && now <= close) status = "open";
          else if (now > close) status = "listed";
        }

        items.push({
          company,
          openDate,
          closeDate,
          listingDate: null,
          priceBand,
          lotSize: cols.length > 4 ? $(cols[4]).text().trim() : "",
          issueSize,
          status,
          listingPrice: null,
          listingGain: null,
          gmp: null,
          gmpPercent: null,
        });
      }
    });

    return items.slice(0, 20);
  } catch {
    return [];
  }
}

async function scrapeRecentListings(): Promise<IPOItem[]> {
  try {
    const html = await fetchPage("https://www.chittorgarh.com/report/ipo-listing-day-performance-bse/82/");
    const $ = cheerio.load(html);
    const items: IPOItem[] = [];

    $("table.table tbody tr").each((_, row) => {
      const cols = $(row).find("td");
      if (cols.length >= 5) {
        const company = $(cols[0]).text().trim();
        const listingDate = $(cols[1]).text().trim();
        const issuePrice = $(cols[2]).text().trim();
        const listingPriceStr = $(cols[3]).text().trim();
        const gainStr = $(cols[4]).text().trim();

        if (!company || company.toLowerCase().includes("no data")) return;

        const listingPrice = parseFloat(listingPriceStr.replace(/[^\d.-]/g, "")) || null;

        items.push({
          company,
          openDate: "",
          closeDate: "",
          listingDate,
          priceBand: issuePrice,
          lotSize: "",
          issueSize: "",
          status: "listed",
          listingPrice,
          listingGain: gainStr,
          gmp: null,
          gmpPercent: null,
        });
      }
    });

    return items.slice(0, 20);
  } catch {
    return [];
  }
}

async function scrapeGMP(): Promise<IPOItem[]> {
  try {
    const html = await fetchPage("https://www.chittorgarh.com/report/ipo-grey-market-premium-702/1/");
    const $ = cheerio.load(html);
    const items: IPOItem[] = [];

    $("table.table tbody tr").each((_, row) => {
      const cols = $(row).find("td");
      if (cols.length >= 4) {
        const company = $(cols[0]).text().trim();
        const priceStr = $(cols[1]).text().trim();
        const gmpStr = $(cols[2]).text().trim();
        const gmpPctStr = $(cols[3]).text().trim();

        if (!company || company.toLowerCase().includes("no data")) return;

        const gmp = parseFloat(gmpStr.replace(/[^\d.-]/g, "")) || null;

        items.push({
          company,
          openDate: "",
          closeDate: "",
          listingDate: null,
          priceBand: priceStr,
          lotSize: "",
          issueSize: "",
          status: "upcoming",
          listingPrice: null,
          listingGain: null,
          gmp,
          gmpPercent: gmpPctStr || null,
        });
      }
    });

    return items.slice(0, 20);
  } catch {
    return [];
  }
}

export async function fetchIPOData(): Promise<IPOData> {
  if (cache.data && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  const [upcoming, recent, gmp] = await Promise.all([
    scrapeUpcomingIPOs(),
    scrapeRecentListings(),
    scrapeGMP(),
  ]);

  const data: IPOData = { upcoming, recent, gmp };
  cache.data = data;
  cache.timestamp = Date.now();
  return data;
}
