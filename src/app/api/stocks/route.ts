import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { fetchStockMetrics } from "@/lib/fetchers/stocks";
import { z } from "zod";

const addStockSchema = z.object({
  symbol: z.string().min(1),
  name: z.string().min(1),
});

export async function GET() {
  try {
    const watchlist = await prisma.watchlistStock.findMany({
      orderBy: { addedAt: "desc" },
    });

    const metricsPromises = watchlist.map((s) => fetchStockMetrics(s.symbol));
    const metrics = await Promise.all(metricsPromises);

    const result = watchlist.map((s, i) => ({
      id: s.id,
      ...metrics[i],
    }));

    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch stocks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { symbol, name } = addStockSchema.parse(body);

    const existing = await prisma.watchlistStock.findUnique({ where: { symbol } });
    if (existing) {
      return NextResponse.json({ error: "Stock already in watchlist" }, { status: 409 });
    }

    const stock = await prisma.watchlistStock.create({
      data: { symbol, name },
    });

    return NextResponse.json(stock, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }
    return NextResponse.json({ error: "Failed to add stock" }, { status: 500 });
  }
}
