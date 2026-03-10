"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function getMyFavorites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  // Join favorites and streamers
  const { data, error } = await supabase
    .from("favorites")
    .select(`
      id,
      created_at,
      streamers (
        id,
        channel_id,
        name,
        image_url,
        verified_mark,
        follower_count
      )
    `)
    .eq("user_id", user.id)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching favorites:", error);
    return { data: null, error: "즐겨찾기 목록을 불러오지 못했습니다." };
  }

  return { data, error: null };
}

export async function addFavorite(streamerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const { data, error } = await supabase
    .from("favorites")
    .insert({
      user_id: user.id,
      streamer_id: streamerId,
    })
    .select()
    .single();

  if (error) {
    console.error("Error adding favorite:", error);
    if (error.code === '23505') { // Unique constraint violation
      return { data: null, error: "이미 즐겨찾기에 추가된 스트리머입니다." };
    }
    return { data: null, error: "즐겨찾기 추가에 실패했습니다." };
  }

  revalidatePath("/favorites");
  revalidatePath("/"); // 메인페이지 연관될 시 갱신
  return { data, error: null };
}

export async function removeFavorite(streamerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { error: "로그인이 필요합니다." };
  }

  const { error } = await supabase
    .from("favorites")
    .delete()
    .match({ user_id: user.id, streamer_id: streamerId });

  if (error) {
    console.error("Error removing favorite:", error);
    return { error: "즐겨찾기 해제에 실패했습니다." };
  }

  revalidatePath("/favorites");
  revalidatePath("/");
  return { error: null };
}

export async function isFavorited(streamerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: false, error: null };
  }

  const { data, error } = await supabase
    .from("favorites")
    .select("id")
    .match({ user_id: user.id, streamer_id: streamerId })
    .maybeSingle();

  if (error) {
    console.error("Error checking favorite status:", error);
    return { data: false, error: null };
  }

  return { data: !!data, error: null };
}
