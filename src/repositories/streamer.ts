import { createClient } from '@/lib/supabase/server'
import { getChzzkChannels } from '@/services/chzzk'

export interface Streamer {
  channel_id: string
  name: string
  image_url: string | null
}

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

  // 2. 없으면 치지직 API에서 조회하여 저장
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
    console.error('Failed to insert streamer', error)
    throw new Error('스트리머 정보 저장에 실패했습니다.')
  }

  return newStreamer as Streamer
}

export async function getStreamers() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('streamers').select('*')
  if (error) throw error
  return data as Streamer[]
}
