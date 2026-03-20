import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const subscription = await req.json()
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: '유효하지 않은 구독 정보입니다.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 1. 구독 정보 저장 (UPSERT)
    const { error: subError } = await adminClient
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get('user-agent'),
        is_active: true,
        last_seen_at: new Date().toISOString()
      }, { onConflict: 'endpoint' })

    if (subError) {
      console.error('Subscription save error:', subError)
      return NextResponse.json({ error: '구독 저장 실패' }, { status: 500 })
    }

    // 2. 초기 알림 설정 생성 (없을 경우에만)
    const { count } = await adminClient
      .from('notification_preferences')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if (count === 0) {
      await adminClient
        .from('notification_preferences')
        .insert({ user_id: user.id })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Web Push Subscribe API Error:', error)
    return NextResponse.json({ error: '다음에 다시 시도해주세요.' }, { status: 500 })
  }
}
