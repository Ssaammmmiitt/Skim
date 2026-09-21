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
  
  let query = admin.from("profiles").select("*").order("created_at", { ascending: true });
  if (status !== "all") {
    query = query.eq("status", status);
  }
  
  const { data: users } = await query;

  // For users, also fetch their digest subscription status so the UI can show if digests are active
  const { data: digestPrefs } = await admin
    .from("user_digest_preferences")
    .select("user_id, email_enabled");
    
  const { data: digestSubs } = await admin
    .from("digest_subscribers")
    .select("user_id, active");
    
  const prefsMap = new Map(digestPrefs?.map(p => [p.user_id, p.email_enabled]) ?? []);
  const subsMap = new Map(digestSubs?.map(s => [s.user_id, s.active]) ?? []);

  const usersWithDigestStatus = (users ?? []).map(u => ({
    ...u,
    digest_active: prefsMap.get(u.id) !== false && subsMap.get(u.id) === true
  }));

  return NextResponse.json({ users: usersWithDigestStatus });
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const { user, profile } = await getAdminProfile(supabase);
  if (!isAdmin(profile) || !user) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const userId = body.userId as string;
  const action = body.action as "approve" | "reject" | "suspend" | "reactivate" | "halt_digest" | "resume_digest";
  
  if (!userId || !["approve", "reject", "suspend", "reactivate", "halt_digest", "resume_digest"].includes(action)) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("email, display_name, status")
    .eq("id", userId)
    .maybeSingle();

  if (!target?.email) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (action === "approve" || action === "reactivate") {
    const { count } = await admin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("status", "active")
      .neq("role", "superuser");

    if ((count ?? 0) >= 10) {
      return NextResponse.json(
        { error: "Member cap reached (10 users). Remove a member before approving or reactivating." },
        { status: 409 }
      );
    }

    await admin
      .from("profiles")
      .update({
        status: "active",
        ...(action === "approve" ? { approved_at: new Date().toISOString(), approved_by: user.id } : {})
      })
      .eq("id", userId);

    if (action === "approve") {
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
    }
  } else if (action === "reject") {
    await admin
      .from("profiles")
      .update({ status: "rejected", approved_by: user.id })
      .eq("id", userId);
  } else if (action === "suspend") {
    await admin
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", userId);
  } else if (action === "halt_digest") {
    await admin.from("digest_subscribers").update({ active: false }).eq("user_id", userId);
    await admin.from("user_digest_preferences").update({ email_enabled: false }).eq("user_id", userId);
  } else if (action === "resume_digest") {
    await admin.from("digest_subscribers").update({ active: true }).eq("user_id", userId);
    await admin.from("user_digest_preferences").update({ email_enabled: true }).eq("user_id", userId);
  }

  return NextResponse.json({ ok: true });
}
