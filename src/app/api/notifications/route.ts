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
    // 중복을 제외하고 20개를 보여주기 위해 넉넉하게 60개를 가져옵니다.
    const { data, error } = await supabase
      .from('notification_deliveries')
      .select('*')
      .eq('user_id', user.id)
      .order('sent_at', { ascending: false })
      .limit(60)

    if (error) throw error

    // 메모리 내 중복 제거 (타입, 제목, 일정 ID 기준)
    const seen = new Set<string>()
    const uniqueItems: any[] = []

    if (data) {
      for (const item of data) {
        const key = `${item.type}_${item.title}_${item.schedule_id || 'no_sched'}`
        if (!seen.has(key)) {
          seen.add(key)
          uniqueItems.push(item)
          if (uniqueItems.length >= 20) break
        }
      }
    }

    return NextResponse.json({ items: uniqueItems })
  } catch (error: any) {
    console.error('Failed to fetch notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

/**
 * 알림 내역 삭제 API (중복 포함 그룹 삭제)
 */
export async function DELETE(req: Request) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  try {
    const { id, all } = await req.json()

    if (all) {
      // 1. 전체 삭제
      const { error } = await supabase
        .from('notification_deliveries')
        .delete()
        .eq('user_id', user.id)
      if (error) throw error
    } else if (id) {
      // 2. 그룹 삭제 (기기별로 발송된 중복 건들 한꺼번에 삭제)
      // 먼저 해당 ID의 정보를 가져옴
      const { data: target } = await supabase
        .from('notification_deliveries')
        .select('type, title, schedule_id')
        .eq('id', id)
        .single()

      if (target) {
        let query = supabase
          .from('notification_deliveries')
          .delete()
          .eq('user_id', user.id)
          .eq('type', target.type)
          .eq('title', target.title)
        
        if (target.schedule_id) {
          query = query.eq('schedule_id', target.schedule_id)
        } else {
          query = query.is('schedule_id', null)
        }

        const { error: delError } = await query
        if (delError) throw delError
      }
    } else {
      return NextResponse.json({ error: '삭제할 ID 또는 전체 삭제 여부가 필요합니다.' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Failed to delete notifications:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
