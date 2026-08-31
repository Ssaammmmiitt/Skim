import { NextRequest, NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { fetchDigest, todayUtc } from "@/lib/digests";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(request: NextRequest) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const dateParam = request.nextUrl.searchParams.get("date");
  const date = dateParam ?? todayUtc();

  if (!DATE_RE.test(date)) {
    return NextResponse.json(
      { error: "Invalid date  -  use YYYY-MM-DD" },
      { status: 400 }
    );
  }

  try {
    const digest = await fetchDigest(auth.ctx.supabase, date);
    return NextResponse.json(digest);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load digest";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
