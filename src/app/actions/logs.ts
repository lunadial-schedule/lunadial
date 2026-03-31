"use server";

/**
 * 스케쥴 업데이트 로그 조회
 * 
 * @param page 페이지
 * @param limit 페이지당 개수
 * @param actionType 액션 타입
 * @param inputMethod 입력 방식
 * @param fetchAdminData 관리자 데이터 여부
 * @returns 스케쥴 업데이트 로그
 */

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";

export type ScheduleUpdateLog = Database["public"]["Tables"]["schedule_update_logs"]["Row"];

export async function getScheduleUpdateLogs({
  page = 1,
  limit = 20,
  actionType,
  inputMethod,
  fetchAdminData = false,
}: {
  page?: number;
  limit?: number;
  actionType?: string;
  inputMethod?: string;
  fetchAdminData?: boolean;
} = {}) {
  const supabase = await createClient();
  
  // 로그 최대 조회 개수
  const MAX_TOTAL_LOGS = 1000;
  
  // 최대 조회 개수 초과 시 빈 데이터 반환
  if ((page - 1) * limit >= MAX_TOTAL_LOGS) {
    return { data: [], totalPages: Math.ceil(MAX_TOTAL_LOGS / limit), error: null };
  }

  const from = (page - 1) * limit;
  const to = Math.min(from + limit - 1, MAX_TOTAL_LOGS - 1);
  
  let query = supabase
    .from("schedule_update_logs")
    .select("*", { count: "exact" })
    .order("logged_at", { ascending: false })
    .range(from, to);
    
  if (actionType && actionType !== "all") {
    query = query.eq("action_type", actionType);
  }
  
  if (inputMethod && inputMethod !== "all") {
    query = query.eq("input_method", inputMethod);
  }
  
  const { data, count, error } = await query;
  if (error) {
    console.error("업데이트 로그 조회 에러:", error);
    return { data: null, totalPages: 0, error: error.message };
  }

  const effectiveCount = count ? Math.min(count, MAX_TOTAL_LOGS) : 0;
  const totalPages = Math.ceil(effectiveCount / limit);

  // 관리자가 아닌 경우(일반 조회), before_data/after_data 등 민감할 수 있는 상세 정보를 null 처리
  // (사실 IP 마스킹은 이미 DB 삽입 시점에 마스킹되어 들어가고, IP 자체가 클라이언트 노출되는 것은 아님)
  if (!fetchAdminData && data) {
    const publicData = data.map(log => ({
      ...log,
      before_data: null,
      after_data: null,
      actor_ip: null
    }));
    return { data: publicData, totalPages, error: null };
  }
  
  return { data, totalPages, error: null };
}
