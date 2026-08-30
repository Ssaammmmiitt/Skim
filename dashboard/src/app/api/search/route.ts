import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { searchArticles } from "@/lib/search";
import type { SearchResult } from "@/lib/types";

export async function GET(request: NextRequest) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [] as SearchResult[] });
  }

  try {
    const results = await searchArticles(auth.ctx.supabase, query);
    return NextResponse.json({ results, query });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
