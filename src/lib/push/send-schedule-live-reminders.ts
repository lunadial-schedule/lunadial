import { createAdminClient } from '@/lib/supabase/admin'
import { sendPushToUser } from './send-to-user'
import { PushPayload } from '@/types/push'

/**
 * 일정 기반 방송 시작 예정 알림 발송 (배치/크론용)
 * 
 * 1. 아직 알림이 발송되지 않은 일정 조회 (now - 10m ~ now + 1h 버퍼 적용)
 * 2. 즐겨찾기 유저 조회
 * 3. 각 사용자의 개별 사전 알림 시간(live_reminder_minutes) (기본값 5분) 도달 여부 확인
 * 4. 알림 발송 및 기록 (중복 방지)
 */
export async function sendScheduleLiveReminders() {
  const supabase = createAdminClient()
  const now = new Date()
  
  // 버퍼 윈도우: 10분 전 ~ 1시간 뒤
  const windowStart = new Date(now.getTime() - 10 * 60 * 1000)
  const windowEnd = new Date(now.getTime() + 60 * 60 * 1000)

  console.log(`\n===========================================`)
  console.log(`[sendScheduleLiveReminders] START EXECUTION`)
  console.log(`[sendScheduleLiveReminders] Current Time : ${now.toISOString()}`)
  console.log(`[sendScheduleLiveReminders] Query Window : ${windowStart.toISOString()} ~ ${windowEnd.toISOString()}`)
  console.log(`===========================================\n`)

  // 1. 발송 대상 일정 조회 (취소되지 않은 일정 중 window 내 시작 일정)
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
    // status 오탈자(canceled/cancelled) 방어
    .not('status', 'in', '("canceled","cancelled")')
    .gte('start_time', windowStart.toISOString())
    .lte('start_time', windowEnd.toISOString())

  if (schedError) {
    console.error('[sendScheduleLiveReminders] ❌ Failed to fetch schedules:', schedError)
    return { success: false, error: schedError }
  }

  if (!schedules || schedules.length === 0) {
    console.log(`[sendScheduleLiveReminders] ℹ️ Array of candidate schedules is empty.`)
    return { success: true, processedSchedules: 0, candidates: 0, sent: 0, skipped: 0, failed: 0 }
  }

  console.log(`[sendScheduleLiveReminders] 🔍 Found ${schedules.length} candidate schedules within window.`)

  let totalSentCount = 0
  let totalSkippedCount = 0
  let totalFailedCount = 0

  for (const schedule of schedules) {
    const streamerName = (schedule.streamers as any)?.name || '스트리머'
    const startTime = new Date(schedule.start_time)
    
    console.log(`\n  --- Processing Schedule: [${schedule.id}] Title: "${schedule.title}" Streamer: "${streamerName}" Start: ${schedule.start_time} Status: ${schedule.status} ---`)

    if (!schedule.streamer_id) {
      console.log(`  [!] Schedule ${schedule.id} has no streamer_id (null or empty). Skipping.`)
      totalSkippedCount++
      continue
    }

    // 2. 해당 스트리머를 즐겨찾기한 사용자 목록 가져오기
    const { data: favorites, error: favError } = await supabase
      .from('favorites')
      .select('user_id')
      .eq('streamer_id', schedule.streamer_id)

    if (favError) {
      console.error(`  [!] Error fetching favorites for streamer ${schedule.streamer_id}:`, favError)
      continue
    }

    if (!favorites || favorites.length === 0) {
      console.log(`  [i] No favorites found for streamer ${schedule.streamer_id}. Skipping schedule.`)
      continue
    }

    const userIds = favorites.map(f => f.user_id)
    console.log(`  [i] Found ${userIds.length} users who favorited this streamer.`)

    // 3. 사용자의 알림 설정(preferences) 확인
    // fallback 처리를 위해 IN 쿼리로 가져온 뒤 애플리케이션 레벨에서 병합
    const { data: prefs, error: prefError } = await supabase
      .from('notification_preferences')
      .select('user_id, notify_live_start, live_reminder_minutes')
      .in('user_id', userIds)

    if (prefError) {
      console.error(`  [!] Error fetching preferences for users:`, prefError)
      continue
    }

    // preference map 생성
    const prefMap = new Map(prefs?.map(p => [p.user_id, p]))

    let schedSent = 0
    let schedSkipped = 0
    let schedFailed = 0

    for (const userId of userIds) {
      const userPref = prefMap.get(userId)
      
      // 설정이 없으면 기본값 적용 (true, 5분)
      const notifyLiveStart = userPref ? userPref.notify_live_start : true
      const reminderMinutes = userPref?.live_reminder_minutes || 5

      if (!notifyLiveStart) {
        console.log(`    [-] User ${userId} has notify_live_start = false. Skpping.`)
        schedSkipped++
        continue
      }

      // 발송 예정 시각 계산
      const notifyAt = new Date(startTime.getTime() - reminderMinutes * 60 * 1000)

      // 아직 알림 발송 시점 전이면 스킵
      if (now < notifyAt) {
        // console.log(`    [-] User ${userId}: Too early. notifyAt is ${notifyAt.toISOString()}`) // 로그가 너무 많아질 수 있으니 주석
        schedSkipped++
        continue
      }

      // 4. 이미 해당 유저에게 이 일정에 대한 알림이 발송되었는지 확인
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
        console.error(`    [!] Error checking delivery history for user ${userId}:`, existError)
        schedFailed++
        continue
      }

      if (existing) {
        console.log(`    [-] User ${userId}: Already received reminder for this schedule.`)
        schedSkipped++
        continue
      }

      // 5. 알림 발송 준비
      const displayHours = startTime.getHours().toString().padStart(2, '0')
      const displayMinutes = startTime.getMinutes().toString().padStart(2, '0')
      const startTimeStr = `${displayHours}:${displayMinutes}` // KST 로컬 타임으로 보이는 효과 (혹은 UTC일 수도 있으나 프론트에서 표기하던 방식과 동일하게)
      
      const payload: PushPayload = {
        title: `${streamerName}님 방송 예정 알림`,
        body: `${startTimeStr} 예정 · ${schedule.title || '방송 예정입니다.'}`,
        url: `/streamer/${schedule.streamer_id}`,
        tag: `schedule-reminder-${schedule.id}`,
        data: { scheduleId: schedule.id, streamerId: schedule.streamer_id }
      }

      console.log(`    [+] Sending push to user ${userId} | Reminder Mins: ${reminderMinutes} | NotifyAt: ${notifyAt.toISOString()}`)
      const res = await sendPushToUser(userId, payload, 'schedule_live_reminder', {
        excludeLocalhost: true,
        scheduleId: schedule.id
      })
      
      if (res.success && res.sent !== undefined && res.sent > 0) {
        schedSent += res.sent
        console.log(`    [OK] User ${userId}: Push sent successfully (${res.sent} devices).`)
      } else {
        console.log(`    [!] User ${userId}: Push failed or 0 devices sent (no active subscriptions).`)
        schedFailed++
      }
    }

    console.log(`  --- Summary for [${schedule.id}] -> Sent: ${schedSent}, Skipped: ${schedSkipped}, Failed: ${schedFailed} ---`)
    totalSentCount += schedSent
    totalSkippedCount += schedSkipped
    totalFailedCount += schedFailed
  }

  console.log(`\n===========================================`)
  console.log(`[sendScheduleLiveReminders] EXECUTION COMPLETE`)
  console.log(`[sendScheduleLiveReminders] Candidates: ${schedules.length} | Sent: ${totalSentCount} | Skipped: ${totalSkippedCount} | Failed: ${totalFailedCount}`)
  console.log(`===========================================\n`)

  return { 
    success: true, 
    processedSchedules: schedules.length,
    sent: totalSentCount,
    skipped: totalSkippedCount,
    failed: totalFailedCount
  }
}
