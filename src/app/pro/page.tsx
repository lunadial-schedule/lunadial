"use client"

import * as React from "react"
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Crown, Check } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { createClient } from "@/lib/supabase/client"

export default function ProPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const [role, setRole] = React.useState<string | null>(null)
  const [isRoleLoading, setIsRoleLoading] = React.useState(true)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    if (isAuthLoading) return
    if (!user) {
      setRole(null)
      setIsRoleLoading(false)
      return
    }

    const fetchRole = async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .maybeSingle()
      setRole(data?.role || "user")
      setIsRoleLoading(false)
    }

    fetchRole()
  }, [user, isAuthLoading, supabase])

  const isPro = role === 'pro' || role === 'admin'
  const isLoading = isAuthLoading || isRoleLoading

  const handleUpgradeClick = () => {
    toast("Pro 결제 연동은 준비 중입니다.")
  }

  const handleCancelClick = () => {
    toast("구독 취소 기능은 준비 중입니다.")
  }

  return (
    <PageContainer className="min-h-[calc(100vh-4rem)] py-12 md:py-20 flex flex-col items-center">
      <div className="text-center space-y-4 max-w-2xl mx-auto mb-12">
        <div className="inline-flex h-16 w-16 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-2">
          <Crown className="h-8 w-8 text-amber-600 dark:text-amber-500" />
        </div>
        <h1 className="text-3xl md:text-5xl font-bold tracking-tight">
          {isPro ? "현재 요금제" : "Pro로 업그레이드"}
        </h1>
        <p className="text-muted-foreground text-lg md:text-xl">
          {isPro ? "Pro의 모든 기능을 이미 자유롭게 이용하고 있습니다." : "스트리머의 일정을 더욱 전문적으로 관리하세요."}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* Free Plan */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle className="text-2xl">Free</CardTitle>
            <CardDescription>가볍게 일정을 확인하는 시청자를 위해</CardDescription>
            <div className="mt-4 font-bold text-4xl">
              ₩0 <span className="text-base font-normal text-muted-foreground">/ 월</span>
            </div>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <ul className="space-y-4 text-sm mb-8">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" />
                <span>기본 일정 캘린더 조회</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" />
                <span>즐겨찾기 스트리머 최대 10명</span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-primary" />
                <span>AI 일정 자동 추출</span>
              </li>
            </ul>
            {isPro ? (
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/5" onClick={handleCancelClick}>
                구독 취소
              </Button>
            ) : (
              <Button variant="outline" className="w-full" disabled>현재 사용 중인 플랜</Button>
            )}
          </CardContent>
        </Card>

        {/* Pro Plan */}
        <Card className="flex flex-col border-amber-500 shadow-md relative overflow-hidden">
          <div className="absolute top-0 inset-x-0 h-1 bg-amber-500" />
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="text-2xl flex items-center gap-2">
                <Crown className="h-5 w-5 text-amber-500" /> Pro
              </CardTitle>
              <span className="text-xs font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-full dark:bg-amber-900/40 dark:text-amber-400">인기</span>
            </div>
            <CardDescription>더 많은 관심 스트리머와 고급 기능을 위해</CardDescription>
            <div className="mt-4 font-bold text-4xl">
              ₩3,900 <span className="text-base font-normal text-muted-foreground">/ 월</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">연 결제 시 ₩39,000 (약 16% 할인)</p>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col justify-between">
            <ul className="space-y-4 text-sm mb-8 font-medium">
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" />
                <span>즐겨찾기 스트리머 <strong>무제한</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" />
                <span>서비스 내 모든 <strong>광고 제거</strong></span>
              </li>
              <li className="flex items-center gap-3">
                <Check className="h-4 w-4 text-amber-500" />
                <span>개인 캘린더 앱(Google, Apple) 연동 (예정)</span>
              </li>
            </ul>
            {isLoading ? (
              <Button className="w-full" disabled>로딩 중...</Button>
            ) : isPro ? (
              <Button variant="outline" className="w-full border-amber-500 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/10" disabled>
                현재 사용 중인 플랜
              </Button>
            ) : (
              <Button 
                className="w-full bg-amber-600 hover:bg-amber-700 text-white" 
                onClick={handleUpgradeClick}
              >
                Pro로 업그레이드
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
