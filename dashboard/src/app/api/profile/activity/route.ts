import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * POST /api/profile/activity
 *
 * Records today's date as an activity row for the authenticated user.
 * Used to compute personal reading streaks.
 *
 * - Idempotent: PRIMARY KEY (user_id, activity_date) ensures one row per day.
 * - Called fire-and-forget from app/template.tsx on every page load.
 * - Requires an active session; silently returns 200 for unauthenticated calls
 *   (e.g. login/public pages) so the client never needs to check auth first.
 */
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Silently succeed for unauthenticated users — the client fires this from
  // template.tsx without knowing if the user is logged in.
  if (!user) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

  const { error } = await supabase.from("user_activity_log").upsert(
    { user_id: user.id, activity_date: today },
    { onConflict: "user_id,activity_date", ignoreDuplicates: true }
  );

  if (error) {
    // Non-fatal — streak will just not increment today
    console.warn("[activity] upsert failed:", error.message);
    return NextResponse.json({ ok: false, error: error.message }, { status: 200 });
  }

  return NextResponse.json({ ok: true });
}
