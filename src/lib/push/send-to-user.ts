import { createAdminClient } from '@/lib/supabase/admin'
import { sendWebPush } from './web-push'
import { PushPayload } from '@/types/push'

/**
 * 특정 사용자(user_id)의 모든 활성 기기로 푸시 알림 발송
 */
export async function sendPushToUser(
  userId: string, 
  payload: PushPayload, 
  type: 'live_start' | 'schedule_changed' | 'notice' | 'test' = 'test'
) {
  const supabase = createAdminClient()
  
  // 1. 활성 구독 정보 조회
  const { data: subs, error } = await supabase
    .from('push_subscriptions')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)

  if (error) {
    console.error('Failed to fetch subscriptions:', error)
    return { success: false, error }
  }

  if (!subs || subs.length === 0) {
    return { success: true, sent: 0, reason: 'no_active_subscriptions' }
  }

  const results = await Promise.all(
    subs.map(async (sub) => {
      const res = await sendWebPush(sub, payload)
      
      // 2. 결과 기록 (notification_deliveries)
      await supabase.from('notification_deliveries').insert({
        user_id: userId,
        subscription_id: sub.id,
        type,
        title: payload.title,
        body: payload.body || null,
        status: res.success ? 'sent' : (res.isExpired ? 'skipped' : 'failed'),
        error_message: res.success ? null : res.message
      })

      // 3. 만료된 구독 처리
      if (res.isExpired) {
        await supabase
          .from('push_subscriptions')
          .update({ is_active: false })
          .eq('id', sub.id)
      }

      return res.success
    })
  )

  const sentCount = results.filter(Boolean).length
  return { 
    success: true, 
    total: subs.length, 
    sent: sentCount, 
    failed: subs.length - sentCount 
  }
}
