"use server";

/**
 * 일정(Schedule) Server Actions
 *
 * Supabase schedules 테이블에 대한 CRUD 작업을 Server Action으로 제공한다.
 * 수정 시 동시성 제어(Optimistic Locking)를 적용하여 충돌을 방지한다.
 */
import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { revalidatePath } from "next/cache";

/** 일정 Row 타입 (DB 스키마 기반) */
export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
/** 일정 Insert 타입 */
export type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];
/** 일정 Update 타입 */
export type ScheduleUpdate = Database["public"]["Tables"]["schedules"]["Update"];

/**
 * 일정 목록을 조회한다.
 * @param startDate - (선택) 시작일 필터
 * @param endDate - (선택) 종료일 필터
 */
export async function getSchedules(startDate?: Date, endDate?: Date) {
  const supabase = await createClient();
  
  let query = supabase.from("schedules").select("*").order("start_time", { ascending: true });
  
  if (startDate) {
    query = query.gte("start_time", startDate.toISOString());
  }
  
  if (endDate) {
    query = query.lte("start_time", endDate.toISOString());
  }
  
  const { data, error } = await query;
  if (error) {
    console.error("일정 조회 에러:", error);
    return { data: null, error: error.message };
  }
  
  return { data, error: null };
}

/**
 * 새 일정을 생성한다.
 * user_id는 현재 인증된 사용자에서 자동 설정된다.
 * @param schedule - 생성할 일정 데이터 (user_id 제외)
 */
export async function createSchedule(schedule: Omit<ScheduleInsert, "user_id">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }
  
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      ...schedule,
      user_id: user.id
    })
    .select()
    .single();
    
  if (error) {
    console.error("일정 생성 에러:", error);
    return { data: null, error: error.message };
  }
  
  revalidatePath("/");
  revalidatePath("/calendar");
  return { data, error: null };
}

/**
 * 기존 일정을 수정한다.
 * Optimistic Locking: 수정 전 updated_at을 비교하여 동시 수정 충돌을 방지한다.
 * @param id - 일정 ID
 * @param updates - 수정할 필드들
 * @param currentUpdatedAt - 클라이언트가 마지막으로 확인한 updated_at 값
 */
export async function updateSchedule(id: string, updates: ScheduleUpdate, currentUpdatedAt: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }
  
  // 동시성 제어: 현재 DB의 updated_at 확인
  const { data: currentSchedule, error: fetchError } = await supabase
    .from("schedules")
    .select("updated_at")
    .eq("id", id)
    .single();
    
  if (fetchError || !currentSchedule) {
    return { data: null, error: "일정을 찾을 수 없습니다." };
  }
  
  // 다른 사용자가 이미 수정했는지 확인
  if (currentSchedule.updated_at !== currentUpdatedAt) {
    return { data: null, error: "다른 사용자에 의해 일정이 이미 수정되었습니다. 최신 정보를 확인 후 다시 시도해주세요.", conflict: true };
  }
  
  const { data, error } = await supabase
    .from("schedules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("일정 수정 에러:", error);
    return { data: null, error: error.message };
  }
  
  revalidatePath("/");
  revalidatePath("/calendar");
  return { data, error: null };
}

/**
 * 일정을 삭제한다.
 * @param id - 삭제할 일정 ID
 */
export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return { error: "로그인이 필요합니다." };
  }
  
  const { error } = await supabase
    .from("schedules")
    .delete()
    .eq("id", id);
    
  if (error) {
    console.error("일정 삭제 에러:", error);
    return { error: error.message };
  }
  
  revalidatePath("/");
  revalidatePath("/calendar");
  return { error: null };
}
