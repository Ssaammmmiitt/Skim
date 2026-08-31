import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isAdmin, type Profile } from "@/lib/auth/types";
import { notifyUserApproved } from "@/lib/mailtrap";

async function getAdminProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { user: null, profile: null };

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  return { user, profile };
}

export async function GET(request: Request) {
  const supabase = await createClient();
  const { profile } = await getAdminProfile(supabase);
  if (!isAdmin(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();
  const status = new URL(request.url).searchParams.get("status") ?? "pending";
  const { data: users } = await admin
    .from("profiles")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: true });

  return NextResponse.json({ users: users ?? [] });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, profile } = await getAdminProfile(supabase);
  if (!isAdmin(profile) || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const userId = body.userId as string;
  const action = body.action as "approve" | "reject";
  if (!userId || !["approve", "reject"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("email, display_name")
    .eq("id", userId)
    .maybeSingle();

  if (!target?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "approve") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("role", "superuser");

    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { error: "Member cap reached (10 users). Remove a member before approving." },
        { status: 409 }
      );
    }

    await admin
      .from("profiles")
      .update({
        status: "active",
        approved_at: new Date().toISOString(),
        approved_by: user.id,
      })
      .eq("id", userId);

    await admin.from("digest_subscribers").upsert(
      { user_id: userId, email: target.email, active: true },
      { onConflict: "email" }
    );
    await admin
      .from("user_digest_preferences")
      .upsert({ user_id: userId }, { onConflict: "user_id" });

    void notifyUserApproved({
      email: target.email,
      display_name: target.display_name,
    });
  } else {
    await admin
      .from("profiles")
      .update({ status: "rejected", approved_by: user.id })
      .eq("id", userId);
  }

  return NextResponse.json({ ok: true });
}
