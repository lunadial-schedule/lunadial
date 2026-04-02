"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath } from "next/cache";

export async function getMaintenanceStats() {
  const supabase = createAdminClient();

  // 1. 전체 활성 스트리머 수
  const { count: totalActiveCount } = await supabase
    .from("streamers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true);

  // 2. 채널 ID 누락자 수 (백필 필요)
  const { count: missingChannelIdCount } = await supabase
    .from("streamers")
    .select("*", { count: "exact", head: true })
    .eq("is_active", true)
    .is("channel_id", null);

  // 3. 마지막 공식 업데이트 시각
  const { data: lastUpdatedData } = await supabase
    .from("streamers")
    .select("updated_at")
    .eq("source_type", "api_verified")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    totalActive: totalActiveCount || 0,
    missingChannelId: missingChannelIdCount || 0,
    lastVerifiedUpdateAt: lastUpdatedData?.updated_at || null,
  };
}

export async function revalidateAdminSystemPath() {
  revalidatePath("/admin/system/chzzk-session");
}
