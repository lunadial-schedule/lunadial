import { NextResponse } from 'next/server'
import { sendScheduleLiveReminders } from '@/lib/push/send-schedule-live-reminders'
import { createClient } from '@/lib/supabase/server'

/**
 * [개발/관리자용 진입점]
 * 일정 기반 방송 시작 알림 로직을 수동으로 즉시 트리거하고 결과를 요약해서 받음.
 * POST /api/dev/run-schedule-live-reminders
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  
  // 환경 변수 기반 로컬 개발 통과 또는 관리자 권한 체크
  const isDev = process.env.NODE_ENV === 'development'
  const { data: { user } } = await supabase.auth.getUser()
  
  if (!isDev && !user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }


  try {
    console.log('[DEV] /api/dev/run-schedule-live-reminders Triggered.')

    const result = await sendScheduleLiveReminders()

    return NextResponse.json({
      message: 'Manual Trigger Finished.',
      ...result
    })
  } catch (error: any) {
    console.error('[DEV] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
