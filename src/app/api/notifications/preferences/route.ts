import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * 알림 설정 조회 (GET)
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const adminClient = createAdminClient()
    const { data, error } = await adminClient
      .from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (error && error.code !== 'PGRST116') {
      return NextResponse.json({ error: '설정 조회 실패' }, { status: 500 })
    }

    // 데이터가 없으면 기본값 반환
    const defaultPrefs = {
      user_id: user.id,
      notify_live_start: true,
      notify_schedule_change: true,
      notify_notice: true,
      quiet_hours_enabled: false,
      quiet_hours_start: null,
      quiet_hours_end: null
    }

    return NextResponse.json(data || defaultPrefs)
  } catch (error) {
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}

/**
 * 알림 설정 저장 (PUT)
 */
export async function PUT(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const adminClient = createAdminClient()

    const { data, error } = await adminClient
      .from('notification_preferences')
      .upsert({
        user_id: user.id,
        ...body,
        updated_at: new Date().toISOString()
      })
      .select()
      .single()

    if (error) {
      console.error('Prefs update error:', error)
      return NextResponse.json({ error: '설정 저장 실패' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json({ error: '서버 에러' }, { status: 500 })
  }
}
