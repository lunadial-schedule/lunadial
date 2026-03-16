/**
 * 웹 푸시 구독 등록 API
 *
 * 브라우저의 PushSubscription 객체를 받아 서버에 저장한다.
 * VAPID 키를 사용하여 웹 푸시 알림을 발송할 수 있다.
 *
 * TODO(DB 저장): 현재 MVP에서는 로그만 남기며, 실제 push_subscriptions 테이블에 저장하도록 구현 필요
 */
import { NextResponse } from 'next/server'
import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/config/env'
import { createClient } from '@/lib/supabase/server'

// VAPID 키 설정 (서버 시작 시 1회)
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@lunadial.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const subscription = await req.json()

    // TODO(DB 저장): push_subscriptions 테이블에 저장 구현 필요
    // await supabase.from('push_subscriptions').insert({ user_id: user.id, subscription })
    console.log('웹 푸시 구독 등록:', user.id)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('웹 푸시 구독 저장 에러:', error)
    return NextResponse.json({ error: '구독 등록 실패' }, { status: 500 })
  }
}
