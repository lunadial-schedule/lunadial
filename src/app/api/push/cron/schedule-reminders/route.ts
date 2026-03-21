import { NextResponse } from 'next/server'
import { sendScheduleLiveReminders } from '@/lib/push/send-schedule-live-reminders'

/**
 * 일정 기반 알림 발송 크론 API
 * 
 * 외부 크론 서비스(Vercel Cron, GitHub Actions 등)에서 
 * 주기적으로(예: 1~5분 간격) 이 API를 호출하여 알림을 발송한다.
 */
export async function GET(req: Request) {
  // 보안을 위한 단순 API 키 체크 (필요 시 환경변수 설정)
  const authHeader = req.headers.get('Authorization')
  if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    console.log('[CRON] Starting schedule reminders batch...')
    const result = await sendScheduleLiveReminders()
    
    return NextResponse.json({
      message: 'Schedule reminders processed',
      ...result
    })
  } catch (error: any) {
    console.error('[CRON] Failed to process schedule reminders:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST로도 호출 가능하게 지원
export async function POST(req: Request) {
  return GET(req)
}
