import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const SUPERUSER_EMAIL = process.env.SKIM_SUPERUSER_EMAIL?.toLowerCase();
const ADMIN_EMAIL =
  process.env.SKIM_ADMIN_CONTACT_EMAIL ?? process.env.SKIM_SUPERUSER_EMAIL;

async function notifyAdminOfSignup(profile: {
  email: string;
  display_name: string | null;
  auth_provider: string | null;
}) {
  const token = process.env.MAILTRAP_API_TOKEN;
  const sender = process.env.MAILTRAP_SENDER_EMAIL;
  if (!token || !sender || !ADMIN_EMAIL) return;

  const name = profile.display_name ?? profile.email;
  const provider = profile.auth_provider ?? "email";
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? "";
  const html = `
    <p><strong>New Skim signup awaiting approval</strong></p>
    <p>Name: ${name}<br/>Email: ${profile.email}<br/>Provider: ${provider}</p>
    <p>Review requests in the <a href="${site}/admin">Admin panel</a>.</p>
  `;

  await fetch("https://send.api.mailtrap.io/api/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: {
        email: sender,
        name: process.env.MAILTRAP_SENDER_NAME ?? "Skim",
      },
      to: [{ email: ADMIN_EMAIL }],
      subject: `Skim: new signup  -  ${profile.email}`,
      html,
      category: "Skim Admin",
    }),
  });
}

async function syncProfile(user: {
  id: string;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
}) {
  if (!user.email) return null;

  const admin = createAdminClient();
  const metadata = user.user_metadata ?? {};
  const displayName =
    (metadata.full_name as string) ?? (metadata.name as string) ?? null;
  const avatarUrl =
    (metadata.avatar_url as string) ?? (metadata.picture as string) ?? null;
  const provider = (user.app_metadata?.provider as string) ?? "email";
  const isSuperuser =
    SUPERUSER_EMAIL && user.email.toLowerCase() === SUPERUSER_EMAIL;

  const { error: upsertError } = await admin.from("profiles").upsert(
    {
      id: user.id,
      email: user.email,
      display_name: displayName,
      avatar_url: avatarUrl,
      auth_provider: provider,
      ...(isSuperuser
        ? {
            role: "superuser",
            status: "active",
            approved_at: new Date().toISOString(),
          }
        : {}),
    },
    { onConflict: "id" }
  );

  if (upsertError) {
    console.error("auth/complete profile upsert:", upsertError.message);
    return null;
  }

  if (isSuperuser) {
    await admin.from("digest_subscribers").upsert(
      { user_id: user.id, email: user.email, active: true },
      { onConflict: "email" }
    );
    await admin
      .from("user_digest_preferences")
      .upsert({ user_id: user.id }, { onConflict: "user_id" });
  }

  const { data: profile } = await admin
    .from("profiles")
    .select("status, email, display_name, auth_provider")
    .eq("id", user.id)
    .maybeSingle();

  return profile;
}

export async function GET(request: Request) {
  const { origin } = new URL(request.url);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(`${origin}/login?error=session`);
  }

  let profile;
  try {
    profile = await syncProfile(user);
  } catch (error) {
    console.error("auth/complete syncProfile:", error);
    return NextResponse.redirect(`${origin}/login?error=profile`);
  }

  if (!profile) {
    return NextResponse.redirect(`${origin}/login?error=profile`);
  }

  if (profile.status === "pending") {
    await notifyAdminOfSignup({
      email: profile.email,
      display_name: profile.display_name,
      auth_provider: profile.auth_provider,
    });
    return NextResponse.redirect(`${origin}/pending`);
  }

  if (profile.status === "rejected") {
    return NextResponse.redirect(`${origin}/pending`);
  }

  return NextResponse.redirect(`${origin}/`);
}
