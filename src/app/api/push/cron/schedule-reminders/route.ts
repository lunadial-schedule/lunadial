import { NextResponse } from 'next/server'
import { sendScheduleLiveReminders } from '@/lib/push/send-schedule-live-reminders'

/**
 * [배치/크론 진입점]
 * 일정 기반 방송 시작 알림을 주기적으로 발송하기 위해 Vercel Cron 등에서 호출하는 라우트.
 * GET 요청으로 동작하며, Vercel cron에 등록하여 매 1분, 5분 등 적절한 간격으로 구동됨.
 */
export async function GET(req: Request) {
  try {
    // Vercel Cron 헤더를 이용한 보안 체크 (옵션)
    // const authHeader = req.headers.get('authorization')
    // if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    // }

    console.log('[CRON] /api/push/cron/schedule-reminders Triggered.')

    const result = await sendScheduleLiveReminders()

    return NextResponse.json({
      message: 'Schedule reminders processed.',
      ...result
    })
  } catch (error: any) {
    console.error('[CRON] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
