"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { revalidatePath } from "next/cache";

export type Schedule = Database["public"]["Tables"]["schedules"]["Row"];
export type ScheduleInsert = Database["public"]["Tables"]["schedules"]["Insert"];
export type ScheduleUpdate = Database["public"]["Tables"]["schedules"]["Update"];

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
    console.error("Error fetching schedules:", error);
    return { data: null, error: error.message };
  }
  
  return { data, error: null };
}

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
    console.error("Error creating schedule:", error);
    return { data: null, error: error.message };
  }
  
  revalidatePath("/");
  revalidatePath("/calendar");
  return { data, error: null };
}

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
  
  // 만약 누군가 이미 수정했다면
  if (currentSchedule.updated_at !== currentUpdatedAt) {
    // 프론트엔드에서 이를 감지해 사용자에게 알리도록 처리
    return { data: null, error: "다른 사용자에 의해 일정이 이미 수정되었습니다. 최신 정보를 확인 후 다시 시도해주세요.", conflict: true };
  }
  
  const { data, error } = await supabase
    .from("schedules")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
    
  if (error) {
    console.error("Error updating schedule:", error);
    return { data: null, error: error.message };
  }
  
  revalidatePath("/");
  revalidatePath("/calendar");
  return { data, error: null };
}

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
    console.error("Error deleting schedule:", error);
    return { error: error.message };
  }
  
  revalidatePath("/");
  revalidatePath("/calendar");
  return { error: null };
}
