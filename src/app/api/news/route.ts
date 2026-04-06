import { NextRequest, NextResponse } from "next/server";
import { fetchNews } from "@/lib/fetchers/news";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") === "india" ? "india" : "global";
  try {
    const result = await fetchNews(region);
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
