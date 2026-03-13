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

  // TODO: isPro 확인 로직 연동 시 이 부분을 프로필/구독 상태에 따라 변경
  // 현재는 임시로 false 처리하여 모든 사용자(Free)에게 10명 제한 적용
  const isPro = false;
  const maxFavorites = 10;

  if (!isPro) {
    const { count, error: countError } = await supabase
      .from("favorites")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("Error checking favorites count:", countError);
      return { data: null, error: "즐겨찾기 상태를 확인하지 못했습니다." };
    }

    if (count !== null && count >= maxFavorites) {
      return { data: null, error: `Free 플랜은 즐겨찾기를 최대 ${maxFavorites}명까지만 추가할 수 있습니다.` };
    }
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
