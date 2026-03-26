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
import { getActorDetails } from "@/lib/actor";

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
  
  let query = supabase.from("schedules").select("*").eq("is_deleted", false).order("start_time", { ascending: true });
  
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
export async function createSchedule(schedule: Omit<ScheduleInsert, "user_id">, inputMethod: 'manual' | 'bulk' = 'manual') {
  const supabase = await createClient();
  const actor = await getActorDetails();
  
  if (!actor) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  if (!schedule.streamer_id) {
    return { data: null, error: "정상적으로 등록된 스트리머를 선택해주세요." };
  }
  
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      ...schedule,
      user_id: actor.userId
    })
    .select()
    .single();
    
  if (error) {
    console.error("일정 생성 에러:", error);
    return { data: null, error: error.message };
  }
  
  // 로그 기록
  await supabase.from("schedule_update_logs").insert({
    schedule_id: data.id,
    action_type: "create",
    input_method: inputMethod,
    title_snapshot: data.title,
    streamer_name_snapshot: data.streamer,
    start_at_snapshot: data.start_time,
    actor_user_id: actor.userId,
    actor_nickname: actor.nickname,
    actor_ip_masked: actor.maskedIp,
    actor_ip: actor.ip,
    actor_role: actor.role,
    change_summary: "새 일정 등록",
    after_data: data as any
  });
  
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/updates");
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
  const actor = await getActorDetails();
  
  if (!actor) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  if (updates.streamer && !updates.streamer_id) {
    return { data: null, error: "정상적으로 등록된 스트리머를 선택해주세요." };
  }
  
  // 동시성 제어: 현재 DB의 정보 확인
  const { data: currentSchedule, error: fetchError } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", id)
    .single();
    
  if (fetchError || !currentSchedule) {
    return { data: null, error: "일정을 찾을 수 없습니다." };
  }
  
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
  
  // 변경 사항 요약 생성
  const changedFields: string[] = [];
  if (updates.title && currentSchedule.title !== updates.title) changedFields.push("제목");
  if (updates.streamer && currentSchedule.streamer !== updates.streamer) changedFields.push("스트리머");
  if (updates.start_time && new Date(currentSchedule.start_time).getTime() !== new Date(updates.start_time).getTime()) changedFields.push("시작 시간");
  if (updates.status && currentSchedule.status !== updates.status) changedFields.push("상태");
  if (updates.is_all_day !== undefined && currentSchedule.is_all_day !== updates.is_all_day) changedFields.push("종일 여부");
  if (updates.categories && JSON.stringify(currentSchedule.categories) !== JSON.stringify(updates.categories)) changedFields.push("카테고리");

  let changeSummary = "일정 수정됨";
  if (changedFields.length === 1) {
    const field = changedFields[0];
    if (field === "상태") changeSummary = `상태 변경: ${updates.status}`;
    else changeSummary = `${field} 수정`;
  } else if (changedFields.length > 1) {
    changeSummary = `${changedFields[0]} 외 ${changedFields.length - 1}개 수정`;
  }

  await supabase.from("schedule_update_logs").insert({
    schedule_id: data.id,
    action_type: "update",
    input_method: "manual",
    title_snapshot: data.title,
    streamer_name_snapshot: data.streamer,
    start_at_snapshot: data.start_time,
    actor_user_id: actor.userId,
    actor_nickname: actor.nickname,
    actor_ip_masked: actor.maskedIp,
    actor_ip: actor.ip,
    actor_role: actor.role,
    change_summary: changeSummary,
    before_data: currentSchedule as any,
    after_data: data as any
  });
  
  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/updates");
  return { data, error: null };
}

/**
 * 일정을 삭제한다.
 * @param id - 삭제할 일정 ID
 */
export async function deleteSchedule(id: string) {
  const supabase = await createClient();
  const actor = await getActorDetails();
  
  if (!actor) {
    return { error: "로그인이 필요합니다." };
  }
  
  const { data: currentSchedule, error: fetchError } = await supabase
    .from("schedules")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !currentSchedule) {
    return { error: "삭제할 일정을 찾을 수 없습니다." };
  }

  const { error } = await supabase
    .from("schedules")
    .update({ is_deleted: true, deleted_at: new Date().toISOString() })
    .eq("id", id);
    
  if (error) {
    console.error("일정 삭제 에러:", error);
    return { error: error.message };
  }
  
  await supabase.from("schedule_update_logs").insert({
    schedule_id: id,
    action_type: "delete",
    input_method: "manual",
    title_snapshot: currentSchedule.title,
    streamer_name_snapshot: currentSchedule.streamer,
    start_at_snapshot: currentSchedule.start_time,
    actor_user_id: actor.userId,
    actor_nickname: actor.nickname,
    actor_ip_masked: actor.maskedIp,
    actor_ip: actor.ip,
    actor_role: actor.role,
    change_summary: "일정 삭제됨",
    before_data: currentSchedule as any
  });

  revalidatePath("/");
  revalidatePath("/calendar");
  revalidatePath("/updates");
  return { error: null };
}

/**
 * 단일 일정을 조회한다. (URL 딥링크 등으로 직접 접근할 때 사용)
 * @param id - 일정 ID
 */
export async function getScheduleById(id: string) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("schedules")
    .select("*, streamers(image_url)")
    .eq("id", id)
    .eq("is_deleted", false)
    .single();
    
  if (error) {
    console.error("단일 일정 조회 에러:", error);
    return { data: null, error: error.message };
  }
  
  return { data: data as any, error: null };
}

/** 홈 카드 렌더에 필요한 최소 필드만 포함하는 타입 */
export type HomeSchedule = Pick<
  Schedule,
  "id" | "title" | "start_time" | "streamer" | "streamer_id" | "status" | "categories" | "is_all_day"
>;

/**
 * 홈 화면 전용 경량화 일정 조회.
 * memo, link, end_time, updated_at, user_id 등 홈 카드 초기 렌더에 불필요한 필드를 제외한다.
 * @param startDate - 조회 시작일
 * @param endDate - 조회 종료일
 */
export async function getHomeSchedules(startDate: Date, endDate: Date) {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, start_time, streamer, streamer_id, status, categories, is_all_day")
    .eq("is_deleted", false)
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true });
  
  if (error) {
    console.error("홈 일정 조회 에러:", error);
    return { data: null, error: error.message };
  }
  
  return { data: data as HomeSchedule[], error: null };
}

/**
 * 현재 사용자의 즐겨찾기 스트리머 이름 목록만 반환.
 * 비로그인 시 빈 배열 반환 (에러가 아니라 정상 흐름).
 * 홈 화면에서 즐겨찾기 필터에만 사용하므로 이름만 필요하다.
 */
export async function getMyFavoriteStreamerNames(): Promise<string[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return [];

  const { data, error } = await supabase
    .from("favorites")
    .select("streamers ( name )")
    .eq("user_id", user.id);

  if (error || !data) return [];

  return data
    .map((f: any) => (f.streamers as any)?.name)
    .filter(Boolean) as string[];
}

