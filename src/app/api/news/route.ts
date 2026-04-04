import { NextRequest, NextResponse } from "next/server";
import { fetchNews } from "@/lib/fetchers/news";

export async function GET(req: NextRequest) {
  const region = req.nextUrl.searchParams.get("region") === "india" ? "india" : "global";
  try {
    const news = await fetchNews(region);
    return NextResponse.json(news);
  } catch {
    return NextResponse.json({ error: "Failed to fetch news" }, { status: 500 });
  }
}
