import { NextResponse } from "next/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";
import { validatePreferences } from "@/lib/preferences-validation";

export async function GET() {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  const { data, error } = await auth.ctx.supabase
    .from("user_digest_preferences")
    .select("*")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ preferences: data });
}

export async function PUT(request: Request) {
  const auth = await requireActiveUser();
  if (!auth.ok) return auth.response;

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { data: existing, error: readError } = await auth.ctx.supabase
    .from("user_digest_preferences")
    .select("*")
    .eq("user_id", auth.ctx.user.id)
    .maybeSingle();

  if (readError) {
    return NextResponse.json({ error: readError.message }, { status: 500 });
  }

  const validated = validatePreferences({
    theme: body.theme ?? existing?.theme,
    format: body.format ?? existing?.format,
    max_stories: body.max_stories ?? existing?.max_stories,
    topic_filters:
      body.topic_filters !== undefined
        ? body.topic_filters
        : existing?.topic_filters,
    email_enabled: body.email_enabled ?? existing?.email_enabled,
    dashboard_theme: body.dashboard_theme ?? existing?.dashboard_theme,
  });

  const payload = {
    user_id: auth.ctx.user.id,
    ...validated,
    updated_at: new Date().toISOString(),
  };

  const write = existing
    ? await auth.ctx.supabase
        .from("user_digest_preferences")
        .update(validated)
        .eq("user_id", auth.ctx.user.id)
        .select()
        .single()
    : await auth.ctx.supabase
        .from("user_digest_preferences")
        .insert(payload)
        .select()
        .single();

  if (write.error) {
    console.error("preferences PUT:", write.error.message);
    return NextResponse.json({ error: write.error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: write.data });
}
