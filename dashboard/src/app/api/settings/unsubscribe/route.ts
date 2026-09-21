import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";

/**
 * POST /api/settings/unsubscribe
 *
 * Instantly unsubscribes the authenticated user from daily digest emails.
 * Does NOT require a full form save — designed to be called from the toast
 * unsubscribe action or the Settings page one-click button.
 *
 * Idempotent: safe to call multiple times.
 */
export async function POST() {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const userId = auth.ctx.user.id;

  // 1. Set email_enabled = false in user_digest_preferences
  const { error: prefErr } = await auth.ctx.supabase
    .from("user_digest_preferences")
    .update({ email_enabled: false, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (prefErr) {
    console.error("[unsubscribe] preferences update failed:", prefErr.message);
    return NextResponse.json(
      { error: "Failed to update preferences. Please try again." },
      { status: 500 }
    );
  }

  // 2. Deactivate digest_subscribers row (non-fatal if row doesn't exist)
  const { error: subErr } = await auth.ctx.supabase
    .from("digest_subscribers")
    .update({ active: false })
    .eq("user_id", userId);

  if (subErr) {
    // Non-fatal — preferences row is already updated; subscriber row may not exist yet
    console.warn("[unsubscribe] digest_subscribers update failed:", subErr.message);
  }

  return NextResponse.json({ success: true });
}

/**
 * POST /api/settings/resubscribe
 * Counterpart — re-enables email delivery.
 */
export async function PUT() {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const userId = auth.ctx.user.id;

  const { error: prefErr } = await auth.ctx.supabase
    .from("user_digest_preferences")
    .update({ email_enabled: true, updated_at: new Date().toISOString() })
    .eq("user_id", userId);

  if (prefErr) {
    console.error("[resubscribe] preferences update failed:", prefErr.message);
    return NextResponse.json(
      { error: "Failed to re-enable emails. Please try again." },
      { status: 500 }
    );
  }

  // Reactivate digest_subscribers row
  const { error: subErr } = await auth.ctx.supabase
    .from("digest_subscribers")
    .update({ active: true })
    .eq("user_id", userId);

  if (subErr) {
    console.warn("[resubscribe] digest_subscribers update failed:", subErr.message);
  }

  return NextResponse.json({ success: true });
}
