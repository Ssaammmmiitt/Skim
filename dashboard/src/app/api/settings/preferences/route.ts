import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireActiveUser } from "@/lib/auth/require-active-user";

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

  const body = await request.json();
  const { data, error } = await auth.ctx.supabase
    .from("user_digest_preferences")
    .upsert({
      user_id: auth.ctx.user.id,
      theme: body.theme,
      format: body.format,
      max_stories: body.max_stories,
      topic_filters: body.topic_filters,
      email_enabled: body.email_enabled,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ preferences: data });
}
