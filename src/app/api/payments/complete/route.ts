/**
 * 결제 완료 검증 API (포트원)
 *
 * 클라이언트에서 결제 완료 후 paymentId를 보내면,
 * 포트원 API로 결제 상태와 금액을 검증한 뒤 사용자의 tier를 'pro'로 업데이트한다.
 *
 * 처리 흐름:
 * 1. 포트원 결제 단건 조회 API로 결제 상태 확인
 * 2. 상태가 'PAID'이고 금액이 39,000원인지 검증
 * 3. 검증 통과 시 users 테이블의 tier를 'pro'로 업데이트
 */
import { NextResponse } from 'next/server'
import { PORTONE_API_SECRET } from '@/config/env'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json()
    
    // 1. 포트원 API로 결제 상태 검증
    const paymentResponse = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { 
        'Authorization': `PortOne ${PORTONE_API_SECRET}` 
      },
    })
    
    if (!paymentResponse.ok) {
      throw new Error(`결제 ID ${paymentId} 검증 실패`)
    }

    const payment = await paymentResponse.json()
    
    // 2. 결제 상태 확인
    if (payment.status !== 'PAID') {
      return NextResponse.json({ error: '결제가 완료되지 않았습니다.' }, { status: 400 })
    }

    // 3. 금액 일치 확인 (39,000원)
    if (payment.amount.total !== 39000) {
      return NextResponse.json({ error: '결제 금액이 일치하지 않습니다.' }, { status: 400 })
    }

    // 4. 사용자 tier 업그레이드
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('users').update({ tier: 'pro' }).eq('id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('결제 검증 실패:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
