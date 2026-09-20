import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { article_id } = await request.json();

    if (typeof article_id !== "number") {
      return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("bookmarks")
      .insert({ user_id: user.id, article_id });

    if (error) {
      if (error.code === "23505") { // Unique violation
        return NextResponse.json({ success: true }); // Already bookmarked
      }
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}

export async function DELETE(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { article_id } = await request.json();

    if (typeof article_id !== "number") {
      return NextResponse.json({ error: "Invalid article ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("bookmarks")
      .delete()
      .eq("user_id", user.id)
      .eq("article_id", article_id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Bad request" }, { status: 400 });
  }
}
