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

    const { endpoint } = await req.json()
    if (!endpoint) {
      return NextResponse.json({ error: 'Endpoint가 필요합니다.' }, { status: 400 })
    }

    const adminClient = createAdminClient()

    // 해당 유저의 특정 엔드포인트 비활성화
    const { error } = await adminClient
      .from('push_subscriptions')
      .update({ is_active: false })
      .eq('user_id', user.id)
      .eq('endpoint', endpoint)

    if (error) {
      return NextResponse.json({ error: '구독 해제 실패' }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Web Push Unsubscribe API Error:', error)
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}
