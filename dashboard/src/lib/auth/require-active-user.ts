import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "./types";

type ActiveUserContext = {
  user: User;
  profile: Profile;
  supabase: Awaited<ReturnType<typeof createClient>>;
};

type ActiveUserResult =
  | { ok: true; ctx: ActiveUserContext }
  | { ok: false; response: NextResponse };

export async function requireActiveUser(): Promise<ActiveUserResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle<Profile>();

  if (error || !profile) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Profile not found" }, { status: 403 }),
    };
  }

  if (profile.status !== "active") {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "Account not approved" },
        { status: 403 }
      ),
    };
  }

  return { ok: true, ctx: { user, profile, supabase } };
}
