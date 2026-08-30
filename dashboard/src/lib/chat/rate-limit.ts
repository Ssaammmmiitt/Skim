import { createAdminClient } from "@/lib/supabase/admin";

export const CHAT_DAILY_LIMIT = 20;

function todayUtc(): string {
  return new Date().toISOString().split("T")[0];
}

export async function getChatUsage(userId: string): Promise<number> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("chat_usage")
    .select("query_count")
    .eq("user_id", userId)
    .eq("usage_date", todayUtc())
    .maybeSingle();

  return data?.query_count ?? 0;
}

export async function checkChatRateLimit(
  userId: string
): Promise<{ allowed: boolean; remaining: number; used: number }> {
  const used = await getChatUsage(userId);
  return {
    used,
    remaining: Math.max(0, CHAT_DAILY_LIMIT - used),
    allowed: used < CHAT_DAILY_LIMIT,
  };
}

export async function incrementChatUsage(userId: string): Promise<void> {
  const admin = createAdminClient();
  const usageDate = todayUtc();
  const used = await getChatUsage(userId);

  if (used === 0) {
    await admin.from("chat_usage").insert({
      user_id: userId,
      usage_date: usageDate,
      query_count: 1,
    });
    return;
  }

  await admin
    .from("chat_usage")
    .update({ query_count: used + 1 })
    .eq("user_id", userId)
    .eq("usage_date", usageDate);
}
