/**
 * 스트리머(Streamer) 리포지토리
 *
 * Supabase의 streamers 테이블에 대한 CRUD를 캡슐화한다.
 * 스트리머가 DB에 없으면 치지직 API로 채널 정보를 가져와 자동 등록한다.
 */
import { createClient } from '@/lib/supabase/server'
import { getChzzkChannels } from '@/services/chzzk'

/** 스트리머 레코드 타입 */
export interface Streamer {
  channel_id: string
  name: string
  image_url: string | null
}

/**
 * 스트리머가 DB에 존재하는지 확인하고, 없으면 치지직 API에서 조회하여 자동 등록한다.
 * 일정 생성 시 호출되어 스트리머 레코드를 보장한다.
 * @param channelId - 치지직 채널 ID
 * @returns 스트리머 레코드
 */
export async function ensureStreamerExists(channelId: string) {
  const supabase = await createClient()

  // 1. DB에서 먼저 확인
  const { data: existing } = await supabase
    .from('streamers')
    .select('*')
    .eq('channel_id', channelId)
    .single()

  if (existing) {
    return existing as Streamer
  }

  // 2. DB에 없으면 치지직 API로 채널 정보를 가져와 등록
  const channels = await getChzzkChannels([channelId])
  const channel = channels.find(c => c.channelId === channelId)

  if (!channel) {
    throw new Error('스트리머를 찾을 수 없습니다.')
  }

  const { data: newStreamer, error } = await supabase
    .from('streamers')
    .insert({
      channel_id: channel.channelId,
      name: channel.channelName,
      image_url: channel.channelImageUrl
    })
    .select()
    .single()

  if (error || !newStreamer) {
    console.error('스트리머 등록 실패', error)
    throw new Error('스트리머 정보 저장에 실패했습니다.')
  }

  return newStreamer as Streamer
}

/**
 * 전체 스트리머 목록을 조회한다.
 * @returns 스트리머 배열
 */
export async function getStreamers() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('streamers').select('*')
  if (error) throw error
  return data as Streamer[]
}
