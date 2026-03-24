"use server";

import { createClient } from "@/lib/supabase/server";
import { Database } from "@/types/supabase";
import { revalidatePath } from "next/cache";

export type Notice = Database["public"]["Tables"]["notices"]["Row"];
export type NoticeInsert = Database["public"]["Tables"]["notices"]["Insert"];
export type NoticeUpdate = Database["public"]["Tables"]["notices"]["Update"];

export async function getNotices(onlyPublished = true) {
  const supabase = await createClient();
  let query = supabase.from("notices").select("*").order("is_pinned", { ascending: false }).order("created_at", { ascending: false });
  
  if (onlyPublished) {
    query = query.eq("is_published", true);
  }
  
  const { data, error } = await query;
  if (error) {
    console.error("공지사항 목록 조회 에러:", error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function getNoticeById(id: string) {
  const supabase = await createClient();
  const { data, error } = await supabase.from("notices").select("*").eq("id", id).maybeSingle();
  
  if (error) {
    console.error("단일 공지사항 조회 에러:", error);
    return { data: null, error: error.message };
  }
  return { data, error: null };
}

export async function createNotice(notice: Omit<NoticeInsert, "id" | "author_user_id" | "author_nickname">) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { data: insertData, error } = await supabase.from("notices").insert({
    ...notice,
    author_user_id: user.id,
    author_nickname: user.user_metadata?.name || '관리자',
    published_at: notice.is_published ? new Date().toISOString() : null
  }).select().single();

  if (error) {
    console.error("공지 생성 에러:", error);
    return { error: error.message };
  }
  
  revalidatePath("/notices");
  revalidatePath("/admin/notices");
  return { data: insertData, error: null };
}

export async function updateNotice(id: string, updates: NoticeUpdate) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const finalUpdates = { ...updates };
  if (updates.is_published && typeof updates.is_published === 'boolean') {
    finalUpdates.published_at = new Date().toISOString();
  } else if (updates.is_published === false) {
    finalUpdates.published_at = null;
  }

  const { data, error } = await supabase.from("notices").update(finalUpdates).eq("id", id).select().single();

  if (error) {
    console.error("공지 수정 에러:", error);
    return { error: error.message };
  }
  
  revalidatePath("/notices");
  revalidatePath(`/notices/${id}`);
  revalidatePath("/admin/notices");
  return { data, error: null };
}

export async function deleteNotice(id: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "로그인이 필요합니다." };

  const { error } = await supabase.from("notices").delete().eq("id", id);
  if (error) {
    console.error("공지 삭제 에러:", error);
    return { error: error.message };
  }
  
  revalidatePath("/notices");
  revalidatePath("/admin/notices");
  return { error: null };
}
