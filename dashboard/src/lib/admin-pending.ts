import { createAdminClient } from "@/lib/supabase/admin";

export async function countPendingApprovals(): Promise<number> {
  const admin = createAdminClient();
  const { count, error } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("status", "pending");

  if (error) {
    console.error("countPendingApprovals:", error.message);
    return 0;
  }

  return count ?? 0;
}
