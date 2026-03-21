import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

/**
 * 사용자의 최근 알림 수신 이력 조회 API
 */
export async function GET() {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(20)

    if (error) throw error

    return NextResponse.json({ items: data || [] })
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * 알림 내역 삭제 API
 */
export async function DELETE(req: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const { id, all } = await req.json()

    let query = supabase.from('notification_deliveries').delete().eq('user_id', user.id)

    if (all) {
      // 전체 삭제
    } else if (id) {
      query = query.eq('id', id)
    } else {
      return NextResponse.json({ error: '삭제할 ID 또는 전체 삭제 여부가 필요합니다.' }, { status: 400 })
    }

    const { error } = await query

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
