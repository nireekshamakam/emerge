import { NextResponse } from "next/server";
import { fetchEarningsData } from "@/lib/fetchers/earnings";

export async function GET() {
  try {
    const data = await fetchEarningsData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch earnings data" }, { status: 500 });
  }
}
