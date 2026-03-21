import { NextResponse } from 'next/server'
import { sendScheduleLiveReminders } from '@/lib/push/send-schedule-live-reminders'

/**
 * 일정 기반 방송 시작 예정 알림 크론 엔드포인트
 * 
 * Vercel Cron 또는 외부 스케줄러에서 주기적으로(예: 매분) 호출합니다.
 * 보안을 위해 CRON_SECRET 환경변수 검증을 포함할 수 있습니다.
 */
export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 })
  }

  console.log('[API/Cron] Starting schedule reminders batch...')
  
  try {
    const result = await sendScheduleLiveReminders()
    
    return NextResponse.json({
      message: 'Cron triggered successfully',
      result
    })
  } catch (error: any) {
    console.error('[API/Cron] Schedule reminders batch failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
