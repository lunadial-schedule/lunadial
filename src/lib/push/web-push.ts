import webpush from 'web-push'
import { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, VAPID_SUBJECT } from '@/config/env'

// VAPID 설정
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    VAPID_SUBJECT || 'mailto:admin@lunadial.com',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

/**
 * 공통 웹 푸시 발송 함수
 */
export async function sendWebPush(subscription: any, payload: any) {
  try {
    const pushSubscription = {
      endpoint: subscription.endpoint,
      keys: {
        p256dh: subscription.p256dh,
        auth: subscription.auth
      }
    }

    console.log(`[sendWebPush] Sending notification to endpoint: ${subscription.endpoint.slice(0, 30)}...`)

    const response = await webpush.sendNotification(
      pushSubscription,
      JSON.stringify(payload)
    )

    return { success: true, statusCode: response.statusCode }
  } catch (error: any) {
    console.error('Web Push Send Error:', error)
    
    // 404 (Not Found) or 410 (Gone) 는 구독이 만료되거나 유효하지 않음을 의미
    const isExpired = error.statusCode === 404 || error.statusCode === 410
    
    return { 
      success: false, 
      statusCode: error.statusCode, 
      isExpired,
      message: error.message 
    }
  }
}
