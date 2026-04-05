import { NextResponse } from "next/server";
import { fetchIPOData } from "@/lib/fetchers/ipo";

export async function GET() {
  try {
    const data = await fetchIPOData();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: "Failed to fetch IPO data" }, { status: 500 });
  }
}
