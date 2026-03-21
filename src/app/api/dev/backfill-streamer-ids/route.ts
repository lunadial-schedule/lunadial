import { createClient } from "@/lib/supabase/server"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const supabase = await createClient()

  // 환경 변수 기반 로컬 개발 통과 또는 관리자 권한 체크
  const isDev = process.env.NODE_ENV === 'development'
  const { data: { user } } = await supabase.auth.getUser()

  if (!isDev && !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    console.log('[DEV] /api/dev/backfill-streamer-ids Triggered.')

    // 1. streamer_id가 null인 일정 조회
    const { data: schedules, error: fetchError } = await supabase
      .from('schedules')
      .select('id, streamer')
      .is('streamer_id', null)

    if (fetchError) {
      console.error('Failed to fetch schedules with null streamer_id:', fetchError)
      return NextResponse.json({ error: fetchError.message }, { status: 500 })
    }

    if (!schedules || schedules.length === 0) {
      return NextResponse.json({ message: 'No schedules need backfilling. All have streamer_id.' })
    }

    console.log(`Found ${schedules.length} schedules with null streamer_id. Starting backfill...`)

    let successCount = 0
    let failCount = 0
    const failLogs: string[] = []

    for (const schedule of schedules) {
      if (!schedule.streamer) {
        failCount++
        failLogs.push(`[${schedule.id}] No streamer name provided.`)
        continue
      }

      // 2. 스트리머 이름으로 매칭 시도
      const { data: matchedStreamers, error: matchError } = await supabase
        .from('streamers')
        .select('id')
        .eq('name', schedule.streamer)

      if (matchError) {
        failCount++
        failLogs.push(`[${schedule.id}] DB Error matching streamer "${schedule.streamer}": ${matchError.message}`)
        continue
      }

      if (!matchedStreamers || matchedStreamers.length === 0) {
        failCount++
        failLogs.push(`[${schedule.id}] No matching streamer found for "${schedule.streamer}".`)
        continue
      }

      if (matchedStreamers.length > 1) {
        failCount++
        failLogs.push(`[${schedule.id}] Multiple matching streamers found for "${schedule.streamer}". Ambiguous.`)
        continue
      }

      const matchedId = matchedStreamers[0].id

      // 3. Update the schedule with matched streamer_id
      const { error: updateError } = await supabase
        .from('schedules')
        .update({ streamer_id: matchedId })
        .eq('id', schedule.id)

      if (updateError) {
        failCount++
        failLogs.push(`[${schedule.id}] Failed to update schedule with streamer_id: ${updateError.message}`)
      } else {
        successCount++
      }
    }

    const summary = {
      message: 'Backfill process complete.',
      totalCandidates: schedules.length,
      successCount,
      failCount,
      failLogs: failLogs.slice(0, 100) // limit output logs in response
    }

    console.log('[DEV] Backfill Summary:', summary)
    return NextResponse.json(summary)

  } catch (err: any) {
    console.error('Backfill API Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
