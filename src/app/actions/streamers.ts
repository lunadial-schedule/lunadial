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

export async function updateStreamer(streamerId: string, input: {
  name?: string;
  channelUrl?: string | null;
  imageUrl?: string | null;
  followerCount?: number | null;
  verifiedMark?: boolean;
  isActive?: boolean;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return { data: null, error: "로그인이 필요합니다." };
  }

  const updates: any = {};
  if (input.name !== undefined) {
    if (!input.name.trim()) return { data: null, error: "스트리머 이름을 입력해주세요." };
    const normalizedName = normalizeStreamerName(input.name);
    // 중복 확인
    const { data: existing, error: searchError } = await supabase
      .from("streamers")
      .select("id")
      .eq("normalized_name", normalizedName)
      .neq("id", streamerId)
      .maybeSingle();

    if (existing) {
      return { data: null, error: "동일한(유사한) 이름의 다른 스트리머가 이미 존재합니다." };
    }
    updates.name = input.name.trim();
    updates.normalized_name = normalizedName;
  }
  
  if (input.channelUrl !== undefined) updates.channel_url = input.channelUrl;
  if (input.imageUrl !== undefined) updates.image_url = input.imageUrl;
  if (input.followerCount !== undefined) updates.follower_count = input.followerCount;
  if (input.verifiedMark !== undefined) updates.verified_mark = input.verifiedMark;
  if (input.isActive !== undefined) updates.is_active = input.isActive;
  
  updates.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from("streamers")
    .update(updates)
    .eq("id", streamerId)
    .select()
    .single();

  if (error) {
    console.error("Error updating streamer:", error);
    return { data: null, error: "스트리머 수정에 실패했습니다." };
  }

  return { data, error: null };
}

