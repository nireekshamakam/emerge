import { NextResponse } from "next/server";
import { fetchMarketData } from "@/lib/fetchers/markets";

export async function GET() {
  try {
    const data = await fetchMarketData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch market data" }, { status: 500 });
  }
}
