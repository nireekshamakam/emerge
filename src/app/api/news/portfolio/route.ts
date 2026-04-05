import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchPortfolioNews } from "@/lib/fetchers/news";

export async function GET() {
  try {
    const stocks = await prisma.watchlistStock.findMany({
      select: { symbol: true, name: true },
      orderBy: { addedAt: "desc" },
    });

    if (stocks.length === 0) {
      return NextResponse.json([]);
    }

    const news = await fetchPortfolioNews(stocks);
    return NextResponse.json(news);
  } catch {
    return NextResponse.json({ error: "Failed to fetch portfolio news" }, { status: 500 });
  }
}
