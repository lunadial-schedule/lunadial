import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from './send-to-user'
import { PushPayload } from '@/types/push'

/**
 * 특정 스트리머의 방송 시작 알림 발송 유틸리티
 */
export async function sendLiveStartPush(
  streamerId: string, 
  streamerName: string, 
  streamTitle: string
) {
  const supabase = createAdminClient()

  // 1. 해당 스트리머를 즐겨찾기하고 방송 시작 알림이 켜진 사용자 조회
  // notification_preferences와 favorites 조인
  const { data: users, error } = await supabase
    .from('notification_preferences')
    .select(`
      user_id,
      favorites!inner(streamer_id)
    `)
    .eq('notify_live_start', true)
    .eq('favorites.streamer_id', streamerId)

  if (error) {
    console.error('Failed to fetch target users for live start:', error)
    return { success: false, error }
  }

  if (!users || users.length === 0) {
    return { success: true, sentUsers: 0, reason: 'no_target_users' }
  }

  console.log(`Sending live start push to ${users.length} users...`)

  const payload: PushPayload = {
    title: `${streamerName}님이 방송을 시작했습니다!`,
    body: streamTitle,
    url: `/streamer/${streamerId}`, // 실제 스트리머 페이지 URL 구조에 맞춰야 함
    tag: `live-start-${streamerId}`,
    data: { streamerId }
  }

  const results = await Promise.all(
    users.map(user => sendPushToUser(user.user_id, payload, 'live_start'))
  )

  const totalSent = results.reduce((acc, res) => acc + (res.sent || 0), 0)
  const successUsers = results.filter(res => res.success).length

  return {
    success: true,
    targetUsers: users.length,
    successUsers,
    totalSentCount: totalSent
  }
}
