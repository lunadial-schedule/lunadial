"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { PORTONE_STORE_ID, PORTONE_CHANNEL_KEY } from "@/config/env"
import { createClient } from "@/lib/supabase/client"

export default function PricingPage() {
  const [loading, setLoading] = useState(false)
  const [userState, setUserState] = useState<any>(null)

  useEffect(() => {
    // Load PortOne V2 SDK Script
    const script = document.createElement("script")
    script.src = "https://cdn.portone.io/v2/browser-sdk.js"
    script.async = true
    document.body.appendChild(script)

    // Check user auth
    createClient().auth.getUser().then(({ data }) => {
      if (data.user) {
        // Mock fetch tier from users table
        setUserState({ ...data.user, tier: 'free' })
      }
    })
    
    return () => { document.body.removeChild(script) }
  }, [])

  const handleUpgrade = async () => {
    if (!userState) {
      alert("로그인이 필요합니다.")
      return
    }

    setLoading(true)
    try {
      // @ts-ignore
      if (!window.PortOne) {
        throw new Error("PortOne SDK is not loaded.")
      }

      // Generate a unique order ID
      const paymentId = `lunadial_pro_${Date.now()}`

      // @ts-ignore
      const response = await window.PortOne.requestPayment({
        storeId: PORTONE_STORE_ID,
        channelKey: PORTONE_CHANNEL_KEY,
        paymentId,
        orderName: "LUNA DIAL Pro 연간 구독",
        totalAmount: 39000,
        currency: "KRW",
        payMethod: "CARD",
        customer: {
          customerId: userState.id,
          fullName: userState.user_metadata?.full_name || "LUNA DIAL User",
        }
      })

      if (response.code != null) {
        alert(response.message)
        return
      }

      // Validate on server
      const res = await fetch('/api/payments/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentId })
      })

      if (res.ok) {
        alert("Pro 업그레이드가 완료되었습니다!")
        setUserState({ ...userState, tier: 'pro' })
      } else {
        alert("결제 검증에 실패했습니다.")
      }
    } catch (error: any) {
      console.error(error)
      alert("결제 중 오류가 발생했습니다: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="max-w-4xl w-full grid md:grid-cols-2 gap-8">
        {/* Free Tier */}
        <div className="border bg-white dark:bg-zinc-900 rounded-2xl p-8 flex flex-col space-y-6">
          <div>
            <h2 className="text-2xl font-bold">Free</h2>
            <p className="text-zinc-500 mt-2">일반 팬들을 위한 기본 기능</p>
          </div>
          <div className="text-4xl font-extrabold pb-4">₩0<span className="text-lg text-zinc-500 font-medium">/월</span></div>
          <ul className="space-y-3 flex-1">
            <li className="flex items-center gap-2">✓ 캘린더 조회 및 일정 등록</li>
            <li className="flex items-center gap-2">✓ 즐겨찾기 최대 10명</li>
            <li className="flex items-center gap-2">✓ 방송 시작 푸시 알림</li>
            <li className="flex items-center gap-2 text-zinc-400">광고 표시됨</li>
          </ul>
          <Button variant="outline" className="w-full" disabled>현재 이용 중</Button>
        </div>

        {/* Pro Tier */}
        <div className="border-2 border-indigo-600 bg-white dark:bg-zinc-900 rounded-2xl p-8 flex flex-col space-y-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-indigo-600 text-white text-xs px-1 py-1 font-bold rounded-bl-lg">추천</div>
          <div>
            <h2 className="text-2xl font-bold text-indigo-600 dark:text-indigo-400">Pro</h2>
            <p className="text-zinc-500 mt-2">진성 팬을 위한 프리미엄 기능</p>
          </div>
          <div className="text-4xl font-extrabold pb-4">₩3,900<span className="text-lg text-zinc-500 font-medium">/월</span></div>
          <p className="text-xs text-zinc-500 -mt-2">연 39,000원 결제</p>
          <ul className="space-y-3 flex-1 font-medium">
            <li className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">✓ 광고 완벽 제거</li>
            <li className="flex items-center gap-2">✓ 즐겨찾기 무제한</li>
            <li className="flex items-center gap-2">✓ 방송/변경/취소/공지 등 모든 알림</li>
            <li className="flex items-center gap-2">✓ AI 자동 입력 지원</li>
            <li className="flex items-center gap-2">✓ 구글 캘린더 내보내기</li>
          </ul>
          <Button 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white h-12 text-lg" 
            onClick={handleUpgrade} 
            disabled={loading || userState?.tier === 'pro'}
          >
            {loading ? "결제창 여는 중..." : userState?.tier === 'pro' ? "이미 Pro 이용 중" : "Pro 혜택 시작하기"}
          </Button>
        </div>
      </div>
    </div>
  )
}
