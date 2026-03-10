"use server";

import { createClient } from "@/lib/supabase/server";
import { normalizeStreamerName } from "@/lib/utils";

export async function searchStreamers(query: string) {
  if (!query || query.trim().length === 0) return { data: [], error: null };
  
  const supabase = await createClient();
  const normalizedQuery = normalizeStreamerName(query);

  const { data, error } = await supabase
    .from("streamers")
    .select("*")
    .eq("is_active", true)
    // 부분 일치 검색
    .or(`name.ilike.%${query}%,normalized_name.ilike.%${normalizedQuery}%`)
    .order("follower_count", { ascending: false, nullsFirst: false })
    .limit(20);

  if (error) {
    console.error("Error searching streamers:", error);
    return { data: null, error: "스트리머 검색에 실패했습니다." };
  }

  return { data, error: null };
}

export async function findOrCreateStreamer(input: {
  name: string;
  channelUrl?: string;
  imageUrl?: string;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  if (!input.name || input.name.trim().length === 0) {
    return { data: null, error: "스트리머 이름을 입력해주세요." };
  }

  const normalizedName = normalizeStreamerName(input.name);

  if (!normalizedName) {
    return { data: null, error: "유효한 스트리머 이름을 입력해주세요." };
  }

  // 1. 기존 스트리머 검색
  const { data: existing, error: searchError } = await supabase
    .from("streamers")
    .select("*")
    .eq("normalized_name", normalizedName)
    .maybeSingle();

  if (searchError && searchError.details !== "The result contains 0 rows") {
      console.error("Error checking existing streamer:", searchError);
  }

  if (existing) {
    return { data: existing, error: null, isNew: false };
  }

  // 2. 중복이 아니므로 새로 생성
  const insertData = {
    name: input.name.trim(),
    normalized_name: normalizedName,
    channel_url: input.channelUrl || null,
    image_url: input.imageUrl || null,
    source_type: "manual",
    is_active: true,
  };

  const { data: newStreamer, error: insertError } = await supabase
    .from("streamers")
    .insert(insertData)
    .select()
    .single();

  if (insertError) {
    console.error("Error creating streamer:", insertError);
    return { data: null, error: "스트리머 생성에 실패했습니다." };
  }

  return { data: newStreamer, error: null, isNew: true };
}
