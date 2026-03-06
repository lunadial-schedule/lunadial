"use client"

import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState } from "react"
import { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Crown, Star } from "lucide-react"
import Link from "next/link"

export default function AccountSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [nickname, setNickname] = useState("")
  const supabase = createClient()
  
  const [favoritesCount, setFavoritesCount] = useState(0)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user?.user_metadata?.name) {
        setNickname(user.user_metadata.name)
      }
    })

    const favs = localStorage.getItem("lunadial_favorites")
    if (favs) {
      try {
        setFavoritesCount(JSON.parse(favs).length)
      } catch (e) {}
    }
  }, [supabase.auth])

  const handleSave = () => {
    toast.success("프로필 정보가 저장되었습니다.")
  }

  const isPro = false
  const maxFavorites = isPro ? "무제한" : 10

  return (
    <PageContainer className="py-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계정 설정</h1>
          <p className="text-muted-foreground">내 프로필과 계정 정보를 관리하세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
            <CardDescription>
              서비스에서 표시될 프로필 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20">
                <AvatarImage src={user?.user_metadata?.avatar_url || ""} />
                <AvatarFallback className="text-2xl">
                  {user?.user_metadata?.name ? user.user_metadata.name.slice(0,1).toUpperCase() : "U"}
                </AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm" onClick={() => toast("이미지 변경 기능은 준비 중입니다.")}>
                이미지 변경
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input 
                id="nickname" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="닉네임을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input 
                id="email" 
                value={user?.email || "로그인이 필요합니다."} 
                disabled 
                className="bg-muted/50"
              />
            </div>
            
            <Button onClick={handleSave}>변경사항 저장</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>나의 구독 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isPro ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{isPro ? "Pro 플랜" : "Free 플랜"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPro ? "Luna Dial의 모든 기능 사용 중" : "기본 기능 사용 중"}
                  </p>
                </div>
              </div>
              {!isPro && (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" asChild>
                  <Link href="/pro">업그레이드</Link>
                </Button>
              )}
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  즐겨찾기 현황
                </Label>
                <span className="text-sm">
                  <span className="font-medium text-foreground">{favoritesCount}</span>
                  <span className="text-muted-foreground"> / {maxFavorites}</span>
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${isPro ? 'bg-amber-500' : 'bg-primary'}`} 
                  style={{ width: `${isPro ? 100 : Math.min((favoritesCount / 10) * 100, 100)}%` }} 
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
