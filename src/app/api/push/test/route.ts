import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendPushToUser } from '@/lib/push/send-to-user'

/**
 * 테스트용 푸시 발송 API
 */
export async function POST() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const payload = {
      title: '테스트 알림 🔔',
      body: 'Web Push 알림이 정상적으로 수신되었습니다.',
      url: '/settings/notifications',
      tag: 'test-notification'
    }

    const result = await sendPushToUser(user.id, payload, 'test')

    if (!result.success) {
      return NextResponse.json({ error: '발송 중 오류 발생', details: result.error }, { status: 500 })
    }

    return NextResponse.json({ 
      ok: true, 
      sent: result.sent, 
      total: result.total,
      failed: result.failed 
    })
  } catch (error) {
    console.error('Test Push API Error:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}
