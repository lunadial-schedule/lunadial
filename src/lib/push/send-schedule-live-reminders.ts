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
  
  // 조회 윈도우: 현재 시점 기준 -10분 ~ +60분
  // 배치가 늦게 돌아도(지연 실행) 이미 시작한 일정(최근 10분 내)까지는 커버 가능하도록 버퍼 추가
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000) 
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000)

  const summary = {
    now: now.toISOString(),
    window: { start: windowStart.toISOString(), end: windowEnd.toISOString() },
    totalSchedules: 0,
    processedSchedules: 0,
    totalSkipped: 0,
    totalSent: 0,
    totalFailed: 0,
    details: [] as any[]
  }

  console.log(`[sendScheduleLiveReminders] Start check: ${summary.window.start} ~ ${summary.window.end}`)

  // 1. 발송 대상 일정 조회 (취소되지 않은 일정 중 윈도우 이내 시작 예정)
  const { data: schedules, error: schedError } = await supabase
    .from('schedules')
    .select(`
      id,
      title,
      start_time,
      streamer_id,
      status,
      streamers (
        name
      )
    `)
    .neq('status', 'canceled')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())

  if (schedError) {
    console.error('[sendScheduleLiveReminders] Failed to fetch schedules:', schedError)
    return { success: false, error: schedError }
  }

  if (!schedules || schedules.length === 0) {
    console.log('[sendScheduleLiveReminders] No candidate schedules found.')
    return { ...summary, success: true }
  }

  summary.totalSchedules = schedules.length
  console.log(`[sendScheduleLiveReminders] Found ${schedules.length} candidate schedules.`)

  for (const schedule of schedules) {
    const streamerName = (schedule.streamers as any)?.name || '스트리머'
    const startTimeStr = schedule.start_time
    const startTime = new Date(startTimeStr)
    
    const schedLog = {
      scheduleId: schedule.id,
      title: schedule.title,
      streamer: streamerName,
      startTime: startTimeStr,
      results: [] as any[]
    }

    // 2. 해당 스트리머를 즐겨찾기한 모든 사용자 조회
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('streamer_id', schedule.streamer_id)

    if (favError || !favorites || favorites.length === 0) {
      console.log(`[sendScheduleLiveReminders] Skip schedule ${schedule.id}: No favorite users found.`)
      summary.totalSkipped++
      continue
    }

    const userIds = favorites.map(f => f.user_id)

    // 3. 사용자별 알림 설정 조회
    // 데이터가 없는 사용자는 기본값으로 처리하기 위해 LEFT JOIN 대신 전체 유저에 대해 필터링 로직 태움
    const { data: prefs, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, live_reminder_minutes, notify_live_start')
      .in('user_id', userIds)

    if (prefError) {
      console.warn(`[sendScheduleLiveReminders] Failed to fetch prefs for schedule ${schedule.id}:`, prefError)
    }

    // preference가 없는 유저도 기본값으로 포함시키기 위해 favorite 유저 순회
    for (const userId of userIds) {
      const userPref = prefs?.find(p => p.user_id === userId)
      
      // 알림 설정이 명시적으로 꺼져 있는 경우만 제외
      if (userPref && userPref.notify_live_start === false) {
        summary.totalSkipped++
        continue
      }

      const reminderMinutes = userPref?.live_reminder_minutes || 5 // 기본값 5분
      const notifyAt = new Date(startTime.getTime() - reminderMinutes * 60 * 1000)

      // 아직 발송 시점이 아니면 스킵
      if (now < notifyAt) {
        summary.totalSkipped++
        continue
      }

      // 4. 중복 발송 확인 (notification_deliveries)
      const { data: existing, error: existError } = await supabase
        .from('notification_deliveries')
        .select('id')
        .match({
          user_id: userId,
          schedule_id: schedule.id,
          type: 'schedule_live_reminder'
        })
        .maybeSingle()

      if (existError) {
        console.error(`[sendScheduleLiveReminders] Dub check error for user ${userId}:`, existError)
        continue
      }

      if (existing) {
        summary.totalSkipped++
        continue
      }

      // 5. 실제 발송 시도
      const timeLabel = startTime.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false })
      const payload: PushPayload = {
        title: `${streamerName} 방송 예정 알림`,
        body: `${timeLabel} 예정 · ${schedule.title || '방송 예정입니다.'}`,
        url: `/streamer/${schedule.streamer_id}`,
        tag: `schedule-reminder-${schedule.id}`,
        data: { scheduleId: schedule.id, streamerId: schedule.streamer_id }
      }

      const res = await sendPushToUser(userId, payload, 'schedule_live_reminder', {
        excludeLocalhost: true,
        scheduleId: schedule.id
      })
      
      if (res.success && res.sent !== undefined && res.sent > 0) {
        summary.totalSent += res.sent
        schedLog.results.push({ userId, status: 'sent', count: res.sent })
        console.log(`[sendScheduleLiveReminders] Sent to user ${userId} (sched: ${schedule.id})`)
      } else if (!res.success) {
        summary.totalFailed++
        schedLog.results.push({ userId, status: 'failed', error: res.error })
      }
    }

    summary.processedSchedules++
    summary.details.push(schedLog)
  }

  console.log(`[sendScheduleLiveReminders] Summary: schedules=${summary.totalSchedules}, sent=${summary.totalSent}, skip=${summary.totalSkipped}, fail=${summary.totalFailed}`)
  return { ...summary, success: true }
}
