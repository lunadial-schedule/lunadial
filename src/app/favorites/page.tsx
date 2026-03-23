"use client"

/**
 * 즐겨찾기 페이지
 *
 * 좌측: 내 즐겨찾기 스트리머 목록 (추가/제거/편집)
 * 우측: 스트리머 검색 및 추가 (데스크톱), 하단 FAB (모바일)
 * 인증되지 않은 사용자는 로그인 페이지로 리다이렉트한다.
 *
 * 성능: auth는 AuthProvider의 useAuth()로 통합 (중복 호출 제거)
 */
import * as React from "react"
import { PageContainer } from "@/components/layout/page-container"
import { FavoriteList } from "@/components/favorites/favorite-list"
import { StreamerSearchSection } from "@/components/favorites/streamer-search"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { FavoriteSearchSheet } from "@/components/favorites/favorite-search-sheet"
import { AddFavoriteFloatingButton } from "@/components/favorites/add-favorite-floating-button"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter } from "next/navigation"

export default function FavoritesPage() {
  const router = useRouter()
  const { user, isLoading } = useAuth()
  
  React.useEffect(() => {
    // AuthProvider 로딩 완료 후 비로그인 시 리다이렉트
    if (isLoading) return
    
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login")
      } else {
        router.back()
      }
    }
  }, [user, isLoading, router])

  return (
    <PageContainer className="py-4 lg:py-4 bg-background min-h-[calc(100vh-4rem)] flex flex-col gap-5 lg:gap-6">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Side: My Favorites */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="h-9 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0">
              <div className="flex flex-col gap-1.5">
                <CardTitle className="text-lg">내 즐겨찾기</CardTitle>
              </div>
              <div className="lg:hidden pl-2 shrink-0">
                <FavoriteSearchSheet>
                  <Button size="sm" variant="outline" className="h-8 px-2 flex items-center gap-1">
                    <Plus className="h-4 w-4" />
                    <span className="sr-only sm:not-sr-only">추가</span>
                  </Button>
                </FavoriteSearchSheet>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3 bg-muted/5">
              <FavoriteList />
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Search & Add (Desktop Only) */}
        <div className="hidden lg:flex lg:col-span-5 xl:col-span-4 flex-col gap-4 lg:sticky lg:top-[80px]">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="h-9 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0">
              <CardTitle className="text-lg">스트리머 찾기</CardTitle>
            </CardHeader>
            <CardContent className="pt-3 pb-3">
              <StreamerSearchSection />
            </CardContent>
          </Card>
        </div>
      </div>

      <AddFavoriteFloatingButton />
    </PageContainer>
  )
}
