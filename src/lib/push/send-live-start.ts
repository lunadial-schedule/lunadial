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
  const { data: favoriteUsers, error: favError } = await supabase
    .from('favorites')
    .select('user_id')
    .eq('streamer_id', streamerId)

  if (favError) {
    console.error('Failed to fetch favorited users:', favError)
    return { success: false, error: favError }
  }

  if (!favoriteUsers || favoriteUsers.length === 0) {
    return { success: true, sentUsers: 0, reason: 'no_favorites' }
  }

  console.log(`[sendLiveStartPush] Found ${favoriteUsers.length} users who favorited streamer ${streamerId}`)
  const userIds = favoriteUsers.map(f => f.user_id)

  // 2. 그 중 알림 설정이 켜진 사용자 필터링
  const { data: targetUsers, error: prefError } = await supabase
    .from('notification_preferences')
    .select('user_id')
    .in('user_id', userIds)
    .eq('notify_live_start', true)

  if (prefError) {
    console.error('Failed to filter users by notification preferences:', prefError)
    return { success: false, error: prefError }
  }

  if (!targetUsers || targetUsers.length === 0) {
    console.log(`[sendLiveStartPush] No users have notifications enabled for streamer ${streamerId}`)
    return { success: true, sentUsers: 0, reason: 'no_enabled_notifications' }
  }

  // 3. 해당 스트리머의 최신 일정 조회 (메시지용)
  const { data: schedule } = await supabase
    .from('schedules')
    .select('id, title, start_time')
    .eq('streamer_id', streamerId)
    .order('start_time', { ascending: false })
    .limit(1)
    .maybeSingle()

  const users = targetUsers;
  console.log(`[sendLiveStartPush] Sending push to ${users.length} target users based on schedule ${schedule?.id}`)

  // 시간 포맷팅 (HH:mm)
  const startTimeStr = schedule 
    ? new Date(schedule.start_time).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
    : ''

  const payload: PushPayload = {
    title: `${streamerName} 방송 예정 알림`,
    body: schedule 
      ? `${startTimeStr} 예정 · ${schedule.title || '방송 예정입니다.'}` 
      : (streamTitle || '방송 예정입니다.'),
    url: `/streamer/${streamerId}`,
    tag: `live-start-${streamerId}`,
    data: { streamerId, scheduleId: schedule?.id }
  }

  const results = await Promise.all(
    users.map(user => sendPushToUser(user.user_id, payload, 'live_start', { 
      excludeLocalhost: true, // 운영 정책 적용
      scheduleId: schedule?.id 
    }))
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
