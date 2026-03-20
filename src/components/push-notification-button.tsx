"use client"

/**
 * 웹 푸시 알림 버튼 — Service Worker 등록 및 구독 관리
 * 보완사항: 중복 구독 방지, 권한 거부 시 안내, 토스트 알림 연동
 */

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Bell, BellOff, Loader2 } from "lucide-react"

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4)
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/')

  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function PushNotificationButton() {
  const [isSubscribed, setIsSubscribed] = useState(false)
  const [support, setSupport] = useState(false)
  const [loading, setLoading] = useState(true)
  const [permission, setPermission] = useState<NotificationPermission>("default")

  useEffect(() => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window) {
      setSupport(true)
      setPermission(Notification.permission)
      
      navigator.serviceWorker.register('/sw.js').then(async (reg) => {
        const sub = await reg.pushManager.getSubscription()
        if (sub) {
          setIsSubscribed(true)
        }
        setLoading(false)
      }).catch(err => {
        console.error("SW Registration failed:", err)
        setLoading(false)
      })
    } else {
      setLoading(false)
    }
  }, [])

  const subscribeUser = async () => {
    if (permission === "denied") {
      toast.error("알림 권한이 거부되어 있습니다. 브라우저 설정에서 알림을 허용해주세요.")
      return
    }

    setLoading(true)
    try {
      const reg = await navigator.serviceWorker.ready
      
      // VAPID 키 확인
      const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
      if (!vapidKey) {
        throw new Error("VAPID Public Key is missing")
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidKey)
      })
      
      const response = await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      if (!response.ok) throw new Error("서버 구독 등록 실패")

      setIsSubscribed(true)
      setPermission("granted")
      toast.success("기기 알림 설정이 완료되었습니다!")
    } catch (e) {
      console.error("Subscription failed:", e)
      toast.error("알림 설정 중 오류가 발생했습니다.")
    } finally {
      setLoading(false)
    }
  }

  if (!support) return (
    <Button variant="outline" disabled size="sm" className="gap-2">
      <BellOff className="h-4 w-4" />
      알림 미지원
    </Button>
  )

  if (loading) return (
    <Button variant="outline" disabled size="sm" className="gap-2">
      <Loader2 className="h-4 w-4 animate-spin" />
      확인 중...
    </Button>
  )

  return (
    <Button 
      variant={isSubscribed ? "secondary" : "default"}
      onClick={subscribeUser}
      disabled={isSubscribed || permission === "denied"}
      size="sm"
      className="gap-2"
    >
      <Bell className="h-4 w-4" />
      {isSubscribed ? "알림 설정됨" : permission === "denied" ? "알림 차단됨" : "알림 받기"}
    </Button>
  )
}
