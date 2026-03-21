import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from './send-to-user'
import { PushPayload } from '@/types/push'

/**
 * 일정 기반 방송 시작 예정 알림 발송 (배치/크론용)
 * 
 * 1. 아직 알림이 발송되지 않은 향후 1시간 이내 일정을 조회
 * 2. 각 사용자의 개별 사전 알림 시간(live_reminder_minutes)에 도달했는지 확인
 * 3. 해당하는 경우 알림 발송 및 기록
 */
export async function sendScheduleLiveReminders() {
  const supabase = createAdminClient()
  const now = new Date()
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000)

  console.log(`[sendScheduleLiveReminders] Checking schedules between ${now.toISOString()} and ${oneHourLater.toISOString()}`)

  // 1. 발송 대상 일정 조회 (취소되지 않은 일정 중 1시간 이내 시작 예정)
  const { data: schedules, error: schedError } = await supabase
    .from('schedules')
    .select(`
      id,
      title,
      start_time,
      streamer_id,
      streamers (
        name
      )
    `)
    .neq('status', 'canceled')
    .gte('start_time', now.toISOString())
    .lte('start_time', oneHourLater.toISOString())

  if (schedError) {
    console.error('Failed to fetch schedules for reminders:', schedError)
    return { success: false, error: schedError }
  }

  if (!schedules || schedules.length === 0) {
    return { success: true, processedSchedules: 0 }
  }

  console.log(`[sendScheduleLiveReminders] Found ${schedules.length} candidate schedules.`)

  let totalSentCount = 0

  for (const schedule of schedules) {
    const streamerName = (schedule.streamers as any)?.name || '스트리머'
    const startTime = new Date(schedule.start_time)

    // 2. 해당 스트리머를 즐겨찾기하고 알림을 켠 사용자들 조회
    // 3. 사용자의 설정(live_reminder_minutes) 확인을 위해 preferences와 favorites를 조인 (또는 2단계 조회)
    
    // 먼저 즐겨찾기한 사용자 목록 가져오기
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('streamer_id', schedule.streamer_id)

    if (favError || !favorites || favorites.length === 0) continue

    const userIds = favorites.map(f => f.user_id)

    // 사용자의 알림 설정 확인 (live_reminder_minutes 필터링)
    const { data: prefs, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, live_reminder_minutes')
      .in('user_id', userIds)
      .eq('notify_live_start', true)

    if (prefError || !prefs || prefs.length === 0) continue

    for (const pref of prefs) {
      const reminderMinutes = pref.live_reminder_minutes || 5
      const notifyAt = new Date(startTime.getTime() - reminderMinutes * 60 * 1000)

      // 아직 알림 발송 시점이 아니면 스킵
      if (now < notifyAt) continue

      // 4. 이미 해당 유저에게 이 일정에 대한 알림이 발송되었는지 확인 (notification_deliveries 이용)
      const { data: existing, error: existError } = await supabase
        .from('notification_deliveries')
        .select('id')
        .match({
          user_id: pref.user_id,
          schedule_id: schedule.id,
          type: 'schedule_live_reminder'
        })
        .maybeSingle()

      if (existError || existing) continue

      // 5. 발송
      const startTimeStr = startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      const payload: PushPayload = {
        title: `${streamerName} 방송 예정 알림`,
        body: `${startTimeStr} 예정 · ${schedule.title || '방송 예정입니다.'}`,
        url: `/streamer/${schedule.streamer_id}`, // 또는 적절한 일정 상세
        tag: `schedule-reminder-${schedule.id}`,
        data: { scheduleId: schedule.id, streamerId: schedule.streamer_id }
      }

      const res = await sendPushToUser(pref.user_id, payload, 'schedule_live_reminder', {
        excludeLocalhost: true,
        scheduleId: schedule.id
      })
      
      if (res.success && res.sent !== undefined && res.sent > 0) {
        totalSentCount += res.sent
        console.log(`[sendScheduleLiveReminders] Sent reminder to user ${pref.user_id} for schedule ${schedule.id}`)
      }
    }
  }

  return { 
    success: true, 
    processedSchedules: schedules.length,
    totalSentCount 
  }
}
