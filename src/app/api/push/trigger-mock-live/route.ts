import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendLiveStartPush } from '@/lib/push/send-live-start'

/**
 * 실시간 방송 시작 알림 수동 트리거 (테스트용)
 * 
 * 특정 스트리머가 방송을 시작한 것처럼 알림을 강제로 발송한다.
 * 해당 스트리머를 즐겨찾기하고 방송 알림을 켠 사용자들에게 푸시가 간다.
 */
export async function POST(req: Request) {
  const supabase = await createClient()
  console.log('[API] /api/push/trigger-mock-live called')
  
  // 관리자만 할 수 있게 하거나, MVP 단계에선 로그인 사용자만 허용
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const { streamerId, streamerName, streamTitle } = await req.json()

    if (!streamerId || !streamerName) {
      return NextResponse.json({ error: '필수 파라미터 누락' }, { status: 400 })
    }

    const result = await sendLiveStartPush(
      streamerId,
      streamerName,
      streamTitle || '방송을 시작했습니다!'
    )

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('Mock live trigger failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
