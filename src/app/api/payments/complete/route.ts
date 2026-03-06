import { NextResponse } from 'next/server'
import { PORTONE_API_SECRET } from '@/config/env'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { paymentId } = await req.json()
    
    // 1. PortOne 결제 단건 조회 API 호출하여 검증
    const paymentResponse = await fetch(`https://api.portone.io/payments/${encodeURIComponent(paymentId)}`, {
      headers: { 
        'Authorization': `PortOne ${PORTONE_API_SECRET}` 
      },
    })
    
    if (!paymentResponse.ok) {
      throw new Error(`paymentId ${paymentId} 검증 실패`)
    }

    const payment = await paymentResponse.json()
    
    if (payment.status !== 'PAID') {
      return NextResponse.json({ error: 'Payment is not paid' }, { status: 400 })
    }

    if (payment.amount.total !== 39000) {
      return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 })
    }

    // 2. DB 업데이트
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      await supabase.from('users').update({ tier: 'pro' }).eq('id', user.id)
    }

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Payment verification failed:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
