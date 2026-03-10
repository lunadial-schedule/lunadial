"use client"

import * as React from "react"
import { PageContainer } from "@/components/layout/page-container"
import { FavoriteList } from "@/components/favorites/favorite-list"
import { StreamerSearchSection } from "@/components/favorites/streamer-search"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function FavoritesPage() {
  return (
    <PageContainer className="py-8 bg-background min-h-[calc(100vh-4rem)] flex flex-col gap-8">

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Side: My Favorites */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <Card className="border-border/50 shadow-sm overflow-hidden">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-lg">내 즐겨찾기</CardTitle>
              <CardDescription>
                즐겨찾기한 스트리머 목록입니다. 이 목록에 있는 스트리머들의 일정은 캘린더에서 필터링하여 볼 수 있습니다.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6 bg-muted/5">
              <FavoriteList />
            </CardContent>
          </Card>
        </div>

        {/* Right Side: Search & Add */}
        <div className="lg:col-span-5 xl:col-span-4 flex flex-col gap-4 lg:sticky lg:top-[80px]">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="bg-muted/10 border-b pb-4">
              <CardTitle className="text-lg">스트리머 찾기</CardTitle>
              <CardDescription>
                이름으로 검색하여 목록에 추가하세요.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4 sm:pt-6">
              <StreamerSearchSection />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  )
}
