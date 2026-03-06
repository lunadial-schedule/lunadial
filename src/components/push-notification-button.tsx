"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"

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

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setSupport(true)
      navigator.serviceWorker.register('/sw.js').then(reg => {
        reg.pushManager.getSubscription().then(sub => {
          if (sub) setIsSubscribed(true)
        })
      })
    }
  }, [])

  const subscribeUser = async () => {
    try {
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!)
      })
      
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sub)
      })

      setIsSubscribed(true)
      alert("알림 설정이 완료되었습니다!")
    } catch (e) {
      console.error("Subscription failed:", e)
      alert("알림 설정에 실패했습니다.")
    }
  }

  if (!support) return <Button variant="outline" disabled>알림 미지원 브라우저</Button>

  return (
    <Button 
      variant={isSubscribed ? "secondary" : "default"}
      onClick={subscribeUser}
      disabled={isSubscribed}
    >
      {isSubscribed ? "알림 설정됨" : "알림 받기"}
    </Button>
  )
}
