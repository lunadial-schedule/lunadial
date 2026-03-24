"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

export type ScheduleUpdateLog = Database["public"]["Tables"]["schedule_update_logs"]["Row"];

export async function getScheduleUpdateLogs(limit = 50, fetchAdminData = false) {
  const supabase = await createClient();
  
  let query = supabase.from("schedule_update_logs").select("*").order("logged_at", { ascending: false }).limit(limit);
  
  const { data, error } = await query;
  if (error) {
    console.error("업데이트 로그 조회 에러:", error);
    return { data: null, error: error.message };
  }

  // 관리자가 아닌 경우(일반 조회), before_data/after_data 등 민감할 수 있는 상세 정보를 null 처리
  // (사실 IP 마스킹은 이미 DB 삽입 시점에 마스킹되어 들어가고, IP 자체가 클라이언트 노출되는 것은 아님)
  if (!fetchAdminData && data) {
    const publicData = data.map(log => ({
      ...log,
      before_data: null,
      after_data: null
    }));
    return { data: publicData, error: null };
  }
  
  return { data, error: null };
}
