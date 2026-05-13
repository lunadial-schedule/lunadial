"use server";

/**
 * 즐겨찾기(Favorites) Server Actions
 *
 * 사용자의 즐겨찾기 스트리머 목록을 관리한다.
 * 인증된 사용자만 사용 가능하며, 최대 100명으로 제한된다.
 */
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { revalidatePath, unstable_cache } from "next/cache";

import { getServerUser } from "@/lib/auth/server-user";

/**
 * [주의] 캐시 내부에선 cookies() 접근이 불가능하므로, 검증된 userId를 주입받아
 * Admin Client로 안전하게 조회한 후 결과를 캐싱합니다.
 */
const getCachedMyFavoritesData = unstable_cache(
  async (userId: string) => {
    
    // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
    const queryTimer = `Favorites_List_Query_${userId}_${Math.random().toString(36).slice(2, 7)}`;
    console.time(queryTimer);
    const supabase = createAdminClient();

    // favorites + streamers 조인 조회 (follower_count, channel_id 제거)
    const { data, error } = await supabase
      .from("favorites")
      .select(`
        id,
        created_at,
        streamers (
          id,
          name,
          image_url,
          verified_mark
        )
      `)
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    console.timeEnd(queryTimer);

    if (error) {
      console.error("즐겨찾기 조회 에러:", error);
      throw new Error("즐겨찾기 목록을 불러오지 못했습니다.");
    }

    if (!data || data.length === 0) {
      return [];
    }

    const nextSchTimer = `Favorites_NextSchedules_Query_${userId}_${Math.random().toString(36).slice(2, 7)}`;
    console.time(nextSchTimer);
    const streamerIds = data.map(f => (f.streamers as any)?.id).filter(Boolean);

    const { data: schedules } = await supabase
      .from("streamer_next_schedules")
      .select("id, streamer_id, start_time, is_all_day")
      .in("streamer_id", streamerIds);
    console.timeEnd(nextSchTimer);

    const mergeTimer = `Favorites_Merge_Time_${userId}_${Math.random().toString(36).slice(2, 7)}`;
    console.time(mergeTimer);
    const nextBroadcastsByStreamer = (schedules || []).reduce((acc: any, sch: any) => {
      acc[sch.streamer_id] = sch;
      return acc;
    }, {});

    const mergedData = data.map(f => {
      const sId = (f.streamers as any)?.id;
      return {
        ...f,
        next_broadcast: sId && nextBroadcastsByStreamer[sId] ? nextBroadcastsByStreamer[sId] : null
      };
    });
    console.timeEnd(mergeTimer);

    return mergedData;
  },
  ["favorites-cache"],
  { revalidate: 15, tags: ["favorites"] }
);

/**
 * 현재 사용자의 즐겨찾기 목록을 조회한다.
 * 캐시(15초 TTL)를 적용하여 잦은 탭 이동 시의 DB 부하를 줄인다.
 */
export async function getMyFavorites() {
  const totalTimer = `Favorites_Total_${Math.random().toString(36).slice(2, 7)}`;
  console.time(totalTimer);
  const user = await getServerUser();

  if (!user) {
    console.timeEnd(totalTimer);
    return { data: null, error: "로그인이 필요합니다." };
  }

  try {
    const mergedData = await getCachedMyFavoritesData(user.id);
    console.timeEnd(totalTimer);
    return { data: mergedData, error: null };
  } catch (err: any) {
    console.timeEnd(totalTimer);
    return { data: null, error: err.message };
  }
}


/**
 * 즐겨찾기에 스트리머를 추가한다.
 * 최대 100명까지 제한된다.
 * @param streamerId - 추가할 스트리머 ID
 */
export async function addFavorite(streamerId: string) {
  const supabase = await createClient();
  const user = await getServerUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const maxFavorites = 100;

  const { count, error: countError } = await supabase
    .from("favorites")
    .select("*", { count: 'exact', head: true })
    .eq("user_id", user.id);

  if (countError) {
    console.error("즐겨찾기 수 확인 에러:", countError);
    return { data: null, error: "즐겨찾기 상태를 확인하지 못했습니다." };
  }

  if (count !== null && count >= maxFavorites) {
    return { data: null, error: `즐겨찾기는 최대 ${maxFavorites}명까지 추가할 수 있습니다.` };
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
  const user = await getServerUser();

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
  const user = await getServerUser();

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
