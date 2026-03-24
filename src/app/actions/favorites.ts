"use server";

/**
 * 즐겨찾기(Favorites) Server Actions
 *
 * 사용자의 즐겨찾기 스트리머 목록을 관리한다.
 * 인증된 사용자만 사용 가능하며, Free 플랜은 최대 10명으로 제한된다.
 */
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

/**
 * 현재 사용자의 즐겨찾기 목록을 조회한다.
 * favorites 테이블과 streamers 테이블을 JOIN하여 스트리머 정보를 포함한다.
 */
export async function getMyFavorites() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  // favorites + streamers 조인 조회
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
    console.error("즐겨찾기 조회 에러:", error);
    return { data: null, error: "즐겨찾기 목록을 불러오지 못했습니다." };
  }

  return { data, error: null };
}

/**
 * 즐겨찾기에 스트리머를 추가한다.
 * Free 플랜은 최대 10명까지 제한된다.
 * @param streamerId - 추가할 스트리머 ID
 */
export async function addFavorite(streamerId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  // 관리자 또는 Pro 유저인 경우 무제한 즐겨찾기 허용
  const { data: roleData } = await supabase.from("user_roles").select("role").eq("user_id", user.id).maybeSingle();
  const isPro = roleData?.role === 'admin' || roleData?.role === 'pro';
  const maxFavorites = 10;

  if (!isPro) {
    const { count, error: countError } = await supabase
      .from("favorites")
      .select("*", { count: 'exact', head: true })
      .eq("user_id", user.id);

    if (countError) {
      console.error("즐겨찾기 수 확인 에러:", countError);
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
    console.error("즐겨찾기 추가 에러:", error);
    if (error.code === '23505') { // 유니크 제약 조건 위반
      return { data: null, error: "이미 즐겨찾기에 추가된 스트리머입니다." };
    }
    return { data: null, error: "즐겨찾기 추가에 실패했습니다." };
  }

  revalidatePath("/favorites");
  revalidatePath("/");
  return { data, error: null };
}

/**
 * 즐겨찾기에서 스트리머를 제거한다.
 * @param streamerId - 제거할 스트리머 ID
 */
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
    console.error("즐겨찾기 제거 에러:", error);
    return { error: "즐겨찾기 해제에 실패했습니다." };
  }

  revalidatePath("/favorites");
  revalidatePath("/");
  return { error: null };
}

/**
 * 특정 스트리머가 현재 사용자의 즐겨찾기에 포함되어 있는지 확인한다.
 * @param streamerId - 확인할 스트리머 ID
 * @returns data가 true이면 즐겨찾기에 포함됨
 */
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
    console.error("즐겨찾기 상태 확인 에러:", error);
    return { data: false, error: null };
  }

  return { data: !!data, error: null };
}
