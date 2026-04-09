"use server";

/**
 * 📅 일정(Schedule) 코어 Server Actions
 *
 * [역할]
 * Supabase `schedules` 테이블에 대한 C/R/U/D 모든 쓰기/조회 로직을 통제하는 중앙 관제소입니다.
 * UI 컴포넌트들은 DB를 직접 조작하지 않고 반드시 이 액션들을 호출해야 권한, 로깅, 예외처리가 보장됩니다.
 *
 * [주요 특징 및 수정 시 주의사항]
 * 1. 보안/권한: 모든 쓰기 액션은 `getActorDetails()`를 통해 호출한 사용자(Actor)의 신원과 권한(admin 등)을 먼저 검증합니다.
 * 2. 동시성 제어: 일정 수정(`updateSchedule`)은 Optimistic Locking(낙관적 락) 기법을 사용하여, 내가 보고 있던 사이에 남이 수정했다면 에러를 뱉습니다. (`updated_at` 비교)
 * 3. 로깅: 모든 C/U/D 작업은 `schedule_update_logs` 테이블에 증거(snapshot)를 남깁니다.
 *
 * ⚠️ 수정 위치 알림: 일정 중복 정책, 권한 검사 조건 변경 시 이 파일의 로직을 가장 먼저 확인해야 합니다.
 */
import { createClient, createPublicClient } from "@/lib/supabase/server";
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
  
  let query = supabase.from("schedules").select("id, title, start_time, is_all_day, streamer_id, streamer, status, categories, streamers(image_url, verified_mark)").eq("is_deleted", false).order("start_time", { ascending: true });
  
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
 * ✨ 새 일정 생성 처리
 * 
 * [왜 필요한가?]
 * - 사용자가 수동 작성 폼이나 AI 자동 추출을 통해 일정을 추가할 때 최종 등록을 담당합니다.
 * - 본문 작성자(`user_id`)는 클라이언트에서 위조하지 못하도록 서버 세션(`actor`) 기반으로 자동 주입됩니다.
 *
 * [중요 분기: 중복 차단 방벽]
 * - `allow_duplicate`: 이 플래그가 켜져 있어도 `admin` 권한이 없다면 무시되고 에러를 반환합니다. (관리자 전용 예외 처리)
 * 
 * @param schedule - 생성할 데이터 (명시적으로 user_id 파라미터는 제외시킴)
 * @param inputMethod - 'manual' (수동입력) 또는 'bulk' (AI/대량입력)
 * @param allow_duplicate - 관리자에 한해, 기존에 등록된 중복 일정을 무시하고 강제 저장할지 여부
 */
export async function createSchedule(
  schedule: Omit<ScheduleInsert, "user_id">, 
  inputMethod: 'manual' | 'bulk' = 'manual',
  allow_duplicate: boolean = false
) {
  const supabase = await createClient();
  const actor = await getActorDetails();
  
  if (!actor) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  if (allow_duplicate && actor.role !== "admin") {
    return { data: null, error: "중복 무시 강제 저장은 관리자 권한이 필요합니다." };
  }

  if (!schedule.streamer_id) {
    return { data: null, error: "정상적으로 등록된 스트리머를 선택해주세요." };
  }
  
  const { data, error } = await supabase
    .from("schedules")
    .insert({
      ...schedule,
      user_id: actor.userId,
      is_duplicate_ignored: allow_duplicate
    })
    .select()
    .single();
    
  if (error) {
    console.error("일정 생성 에러:", error);
    if (error.code === '23505') {
      return { data: null, error: "동일한 시간에 이미 등록된 일정이 존재합니다. (중복 차단)" };
    }
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
 * 📝 기존 일정 수정 처리
 *
 * [핵심 메커니즘: 낙관적 락 (Optimistic Locking)]
 * - `currentUpdatedAt`을 파라미터로 받아, 현재 DB의 `updated_at`과 일치하는지 대조합니다.
 * - 일치하지 않으면 "누군가 이미 수정함"이라는 경고와 함께 `conflict: true`를 반환하여 데이터가 덮어씌워지는 대참사를 막습니다.
 *
 * [수정 로그 남기기]
 * - 어느 필드가 바뀌었는지 하나하나 대조(diff)하여 `schedule_update_logs`의 `change_summary`에 알기 쉽게 기록합니다. (예: "제목 외 1개 수정")
 *
 * @param id - 수정할 타겟 일정 ID
 * @param updates - 덮어씌울 파편화된 수정 데이터
 * @param currentUpdatedAt - 클라이언트가 수정을 시작했을 당시의 기준 타임스탬프
 * @param allow_duplicate - 관리자 권한으로 중복을 무시하고 강제로 시간을 밀어넣을 때 사용 (기본 false)
 */
export async function updateSchedule(
  id: string, 
  updates: ScheduleUpdate, 
  currentUpdatedAt: string,
  allow_duplicate: boolean = false
) {
  const supabase = await createClient();
  const actor = await getActorDetails();
  
  if (!actor) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  if (allow_duplicate && actor.role !== "admin") {
    return { data: null, error: "중복 무시 강제 저장은 관리자 권한이 필요합니다." };
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
    .update({
      ...updates,
      is_duplicate_ignored: allow_duplicate ? true : updates.is_duplicate_ignored
    })
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("일정 수정 에러:", error);
    if (error.code === '23505') {
      return { data: null, error: "해당 시간으로 이미 등록된 다른 일정이 존재합니다. (중복 차단)" };
    }
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
    .select("*, streamers(image_url, verified_mark)")
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
> & {
  streamers?: {
    image_url: string | null;
    verified_mark: boolean | null;
  } | null;
};

/**
 * 홈 화면 전용 경량화 일정 조회.
 * memo, link, end_time, updated_at, user_id 등 홈 카드 초기 렌더에 불필요한 필드를 제외한다.
 * @param startDate - 조회 시작일
 * @param endDate - 조회 종료일
 */
export async function getHomeSchedules(startDate: Date, endDate: Date) {
  // unstable_cache 스코프 안이므로 쿠키 조회가 불가능. PublicClient 사용.
  const supabase = createPublicClient();
  
  // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
  const timerLabel = `HomeSchedules_Query_${Math.random().toString(36).slice(2, 7)}`;
  console.time(timerLabel);
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, start_time, streamer, streamer_id, status, categories, is_all_day, streamers(image_url, verified_mark)")
    .eq("is_deleted", false)
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true });
  console.timeEnd(timerLabel);
  
  if (error) {
    console.error("홈 일정 조회 에러:", error);
    return { data: null, error: error.message };
  }
  
  return { data: data as any as HomeSchedule[], error: null };
}


/**
 * userId를 직접 받아 즐겨찾기 스트리머 ID 목록을 반환.
 * auth.getUser() 호출 없이 favorites만 조회하므로 auth 중복 호출을 방지한다.
 * @param userId - 조회 대상 사용자 ID
 */
export async function getFavoriteStreamerIdsByUserId(userId: string): Promise<string[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("favorites")
    .select("streamer_id")
    .eq("user_id", userId);

  if (error || !data) return [];

  return data.map((f: any) => f.streamer_id).filter(Boolean) as string[];
}

/**
 * 🔍 동일 스트리머 중복 일정 검사 (Pre-flight)
 *
 * [왜 필요한가?]
 * - 새 일정을 등록하거나 시간을 수정할 때, "해당 스트리머가 동일한 날짜/시간에 이미 일정이 있는지" UI 단에서 사전 경고하기 위해 사용합니다.
 * - 종일(All Day) 일정인 경우 '날짜(Date)' 수준에서 겹치면 중복으로 판정하고, 시간 지정 일정인 경우 '분 단위 시간'이 일치할 때만 중복으로 판정합니다.
 *
 * @param streamerId - 대상 스트리머의 고유 ID
 * @param startTimeStr - 비교할 타겟 UTC ISO 날짜/시간 문자열
 * @param isAllDay - 종일 일정 여부
 * @param excludeId - (선택사항) 일정 '수정' 중일 경우, 자기 자신과 검사하여 중복으로 뜨는 붕괴를 막기 위해 자기 자신의 ID를 기입
 */
export async function checkDuplicateSchedule(
  streamerId: string, 
  startTimeStr: string, 
  isAllDay: boolean, 
  excludeId?: string
) {
  const supabase = await createClient();
  
  // 로컬 시간 기준 자정 ~ 밤 11:59:59 구하기
  const targetDate = new Date(startTimeStr);
  const startOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 0, 0, 0);
  const endOfDay = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate(), 23, 59, 59, 999);
  
  let query = supabase
    .from("schedules")
    .select("id, title, start_time, is_all_day, streamer")
    .eq("streamer_id", streamerId)
    .eq("is_deleted", false)
    .gte("start_time", startOfDay.toISOString())
    .lte("start_time", endOfDay.toISOString());
    
  if (excludeId) {
    query = query.neq("id", excludeId);
  }
  
  const { data, error } = await query;
  if (error || !data || data.length === 0) {
    return { isDuplicate: false, duplicateInfo: null, hasSameDateInfo: null };
  }
  
  // 하루 종일 여부 + 시간이 일치하는 것만 중복으로 봄
  const targetTime = targetDate.getTime();
  const targetDateStr = targetDate.getFullYear() + "-" + targetDate.getMonth() + "-" + targetDate.getDate();

  const duplicate = data.find(s => {
    if (s.is_all_day !== isAllDay) return false;
    
    const sDate = new Date(s.start_time);
    
    if (isAllDay) {
      const sDateStr = sDate.getFullYear() + "-" + sDate.getMonth() + "-" + sDate.getDate();
      return sDateStr === targetDateStr;
    } else {
      return sDate.getTime() === targetTime;
    }
  });
  
  return { 
    isDuplicate: !!duplicate, 
    duplicateInfo: duplicate || null,
    hasSameDateInfo: !duplicate ? data[0] : null
  };
}

/**
 * 캘린더 월간 뷰 전용 일정 조회.
 * 공개 클라이언트를 사용하여 쿠키 접근 최소화 및 전역 캐시(unstable_cache)와 시너지 확보.
 * streamers 프로필 이미지가 필요 없으므로 최소화된 DTO 사용.
 */
export async function getCalendarMonthSchedules(startDate: Date, endDate: Date) {
  const supabase = createPublicClient();
  
  const timerLabel = `Calendar_Month_Query_DB_Raw_${Math.random().toString(36).slice(2, 7)}`;
  console.time(timerLabel);
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, start_time, is_all_day, streamer_id, streamer, status, categories")
    .eq("is_deleted", false)
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true });
  console.timeEnd(timerLabel);
  
  if (error) {
    console.error("월간 캘린더 일정 조회 에러:", error);
    return { data: null, error: error.message };
  }
  
  return { data: data as any as HomeSchedule[], error: null };
}

/**
 * 캘린더 일간 뷰 전용 일정 조회.
 * 조인이 포함되어 있지만 1일 치 검색으로 빠릅니다.
 */
export async function getCalendarDaySchedules(startDate: Date, endDate: Date) {
  const supabase = createPublicClient();
  
  const timerLabel = `Calendar_Day_Query_DB_Raw_${Math.random().toString(36).slice(2, 7)}`;
  console.time(timerLabel);
  const { data, error } = await supabase
    .from("schedules")
    .select("id, title, start_time, streamer, streamer_id, status, categories, is_all_day, streamers(image_url, verified_mark)")
    .eq("is_deleted", false)
    .gte("start_time", startDate.toISOString())
    .lte("start_time", endDate.toISOString())
    .order("start_time", { ascending: true });
  console.timeEnd(timerLabel);
  
  if (error) {
    console.error("일간 캘린더 일정 조회 에러:", error);
    return { data: null, error: error.message };
  }
  
  return { data: data as any as HomeSchedule[], error: null };
}
