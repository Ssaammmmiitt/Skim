import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { hybridRetrieve } from "@/lib/retrieval";
import { searchArticles } from "@/lib/search";

export async function GET(request: NextRequest) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const query = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (!query) {
    return NextResponse.json({ results: [], query: "" });
  }

  const mode = request.nextUrl.searchParams.get("mode") ?? "hybrid";
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Math.min(Math.max(parseInt(limitParam, 10), 1), 50) : 20;

  try {
    if (mode === "hybrid") {
      const results = await hybridRetrieve(auth.ctx.supabase, query, { limit });
      return NextResponse.json({
        results: results.map(({ similarity, fts_rank, rrf_score, retrieval_method, ...rest }) => ({
          ...rest,
          similarity,
          fts_rank,
          rrf_score,
          retrieval_method,
        })),
        query,
        mode: results[0]?.retrieval_method ?? "none",
      });
    }

    const results = await searchArticles(auth.ctx.supabase, query, { limit });
    return NextResponse.json({ results, query, mode: "keyword" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Search failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
