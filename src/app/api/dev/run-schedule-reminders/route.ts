import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendScheduleLiveReminders } from '@/lib/push/send-schedule-live-reminders'

/**
 * 일정 기반 알림 수동 트리거 (개발/관리자용)
 * 
 * 크론 로직을 즉시 실행하고 상세 결과(성공, 실패, 건너뜀)를 반환합니다.
 */
export async function POST() {
  const supabase = await createClient()
  
  // 로그인 여부 확인 (최소한의 보안)
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  // TODO: 실제 운영 환경에서는 관리자 권한(is_admin 등) 체크 로직을 추가하는 것이 좋습니다.

  try {
    const result = await sendScheduleLiveReminders()
    return NextResponse.json(result)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// GET 요청 시에도 동작하게 하여 브라우저에서 편하게 테스트 가능
export async function GET() {
  return POST()
}
