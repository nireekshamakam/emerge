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
  fetchedAt: number;
}

const cache: { data: IPOData | null; timestamp: number } = { data: null, timestamp: 0 };
const CACHE_TTL = 15 * 60 * 1000;

const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  "Pragma": "no-cache",
  "Referer": "https://www.google.com/",
};

async function fetchPage(url: string): Promise<string> {
  const res = await fetch(url, {
    headers: HEADERS,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

// Extract all tables from a page and return rows as arrays of cell text
function extractTables($: ReturnType<typeof cheerio.load>): string[][][] {
  const tables: string[][][] = [];
  $("table").each((_, tbl) => {
    const rows: string[][] = [];
    $(tbl).find("tr").each((_, row) => {
      const cells: string[] = [];
      $(row).find("td, th").each((_, cell) => {
        cells.push($(cell).text().trim().replace(/\s+/g, " "));
      });
      if (cells.length > 0) rows.push(cells);
    });
    if (rows.length > 1) tables.push(rows);
  });
  return tables;
}

function determineStatus(openDate: string, closeDate: string): "upcoming" | "open" | "listed" {
  try {
    const now = new Date();
    const open = new Date(openDate);
    const close = new Date(closeDate);
    if (isNaN(open.getTime()) || isNaN(close.getTime())) return "upcoming";
    if (now >= open && now <= close) return "open";
    if (now > close) return "listed";
    return "upcoming";
  } catch {
    return "upcoming";
  }
}

async function scrapeUpcomingIPOs(): Promise<IPOItem[]> {
  const urls = [
    "https://www.chittorgarh.com/report/mainboard-ipo-list-in-india-702/1/",
    "https://www.chittorgarh.com/ipo/ipo-calendar/",
    "https://ipowatch.in/ipo-grey-market-premium-latest-ipo/",
  ];

  for (const url of urls) {
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const tables = extractTables($);

      for (const rows of tables) {
        const header = rows[0].map((h) => h.toLowerCase());
        const hasCompany = header.some((h) => h.includes("company") || h.includes("ipo") || h.includes("name"));
        const hasDate = header.some((h) => h.includes("date") || h.includes("open") || h.includes("close"));
        if (!hasCompany && !hasDate) continue;

        const items: IPOItem[] = [];
        for (const row of rows.slice(1)) {
          const company = row[0];
          if (!company || company.toLowerCase().includes("company") || company.length < 3) continue;

          // Try to find date columns
          let openDate = "";
          let closeDate = "";
          for (let i = 1; i < row.length; i++) {
            const cell = row[i];
            // Look for date patterns like "Apr 10, 2025" or "10-Apr-2025"
            if (/\d{1,2}[-\s]\w{3}[-\s]\d{4}|\w{3}\s+\d{1,2},\s+\d{4}|\d{4}-\d{2}-\d{2}/.test(cell)) {
              if (!openDate) openDate = cell;
              else if (!closeDate) closeDate = cell;
            }
          }

          // If dates contain "-" separator (date range in one cell)
          for (const cell of row) {
            if (/[-–]/.test(cell) && /\d{4}/.test(cell)) {
              const parts = cell.split(/\s*[-–]\s*/);
              if (parts.length === 2 && !openDate) {
                openDate = parts[0].trim();
                closeDate = parts[1].trim();
              }
            }
          }

          const status = determineStatus(openDate, closeDate);
          const priceBand = row.find((c) => /₹|\d+\s*[-–]\s*\d+/.test(c) && c !== company) || row[3] || "";
          const issueSize = row.find((c) => /cr|crore|\d+\.\d+/i.test(c) && c !== company) || row[2] || "";
          const lotSize = row.find((c) => /^\d+$/.test(c.replace(/,/g, "")) && parseInt(c) > 0 && parseInt(c) < 10000) || "";

          items.push({
            company,
            openDate,
            closeDate,
            listingDate: null,
            priceBand,
            lotSize,
            issueSize,
            status,
            listingPrice: null,
            listingGain: null,
            gmp: null,
            gmpPercent: null,
          });
        }

        if (items.length > 0) return items.slice(0, 20);
      }
    } catch {
      continue;
    }
  }

  return [];
}

async function scrapeRecentListings(): Promise<IPOItem[]> {
  const urls = [
    "https://www.chittorgarh.com/report/ipo-listing-day-performance-bse/82/",
    "https://www.chittorgarh.com/report/ipo-listing-performance/81/",
  ];

  for (const url of urls) {
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const tables = extractTables($);

      for (const rows of tables) {
        const header = rows[0].map((h) => h.toLowerCase());
        const hasListing = header.some((h) => h.includes("list") || h.includes("gain") || h.includes("price"));
        if (!hasListing) continue;

        const items: IPOItem[] = [];
        for (const row of rows.slice(1)) {
          const company = row[0];
          if (!company || company.length < 3 || company.toLowerCase().includes("company")) continue;

          // Find listing date (contains month name or date format)
          const listingDate = row.find((c) =>
            /\d{1,2}[-\s]\w{3}[-\s]\d{4}|\w{3}\s+\d{1,2},\s+\d{4}|\d{2}\/\d{2}\/\d{4}/.test(c)
          ) || row[1] || "";

          // Find issue price and listing price (numeric values with ₹ or plain numbers)
          const numericCells = row.filter((c, i) => i > 0 && /^\s*[₹]?\s*[\d,]+\.?\d*\s*$/.test(c));
          const issuePrice = numericCells[0] || row[2] || "";
          const listingPriceStr = numericCells[1] || row[3] || "";
          const gainStr = row.find((c) => c.includes("%") || (c.includes(".") && (c.includes("+") || c.includes("-")))) || row[4] || "";

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
            listingGain: gainStr || null,
            gmp: null,
            gmpPercent: null,
          });
        }

        if (items.length > 0) return items.slice(0, 20);
      }
    } catch {
      continue;
    }
  }
  return [];
}

async function scrapeGMP(): Promise<IPOItem[]> {
  const urls = [
    "https://www.chittorgarh.com/report/ipo-grey-market-premium-702/1/",
    "https://investorgain.com/report/ipo-gmp-today/33/",
  ];

  for (const url of urls) {
    try {
      const html = await fetchPage(url);
      const $ = cheerio.load(html);
      const tables = extractTables($);

      for (const rows of tables) {
        const header = rows[0].map((h) => h.toLowerCase());
        const hasGMP = header.some((h) => h.includes("gmp") || h.includes("grey") || h.includes("premium"));
        if (!hasGMP) continue;

        const items: IPOItem[] = [];
        for (const row of rows.slice(1)) {
          const company = row[0];
          if (!company || company.length < 3 || company.toLowerCase().includes("company")) continue;

          const gmpIdx = header.findIndex((h) => h.includes("gmp") || h.includes("premium") || h.includes("grey"));
          const gmpStr = (gmpIdx >= 0 && row[gmpIdx]) ? row[gmpIdx] : row[2] || "";
          const gmpPctIdx = header.findIndex((h) => h.includes("%") || h.includes("percent"));
          const gmpPctStr = (gmpPctIdx >= 0 && row[gmpPctIdx]) ? row[gmpPctIdx] : row[3] || "";
          const priceIdx = header.findIndex((h) => h.includes("price") || h.includes("band") || h.includes("issue"));
          const priceBand = (priceIdx >= 0 && row[priceIdx]) ? row[priceIdx] : row[1] || "";

          const gmp = parseFloat(gmpStr.replace(/[^\d.-]/g, "")) || null;

          items.push({
            company,
            openDate: "",
            closeDate: "",
            listingDate: null,
            priceBand,
            lotSize: "",
            issueSize: "",
            status: "upcoming",
            listingPrice: null,
            listingGain: null,
            gmp,
            gmpPercent: gmpPctStr || null,
          });
        }

        if (items.length > 0) return items.slice(0, 20);
      }
    } catch {
      continue;
    }
  }
  return [];
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

  const data: IPOData = { upcoming, recent, gmp, fetchedAt: Date.now() };
  cache.data = data;
  cache.timestamp = Date.now();
  return data;
}
