import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { fetchDigestDates } from "@/lib/digests";

export async function GET() {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  try {
    const dates = await fetchDigestDates(auth.ctx.supabase);
    return NextResponse.json({ dates });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load digest dates";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
