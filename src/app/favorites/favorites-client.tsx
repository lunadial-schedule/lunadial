"use client"

import * as React from "react"
import { PageContainer } from "@/components/layout/page-container"
import { FavoriteList, SortOption } from "@/components/favorites/favorite-list"
import { StreamerSearchSection } from "@/components/favorites/streamer-search"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { FavoriteSearchSheet } from "@/components/favorites/favorite-search-sheet"
import { AddFavoriteFloatingButton } from "@/components/favorites/add-favorite-floating-button"

export function FavoritesClient({ initialFavorites }: { initialFavorites: any[] }) {
  const [sortOption, setSortOption] = React.useState<SortOption>('next_broadcast')
  
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Favorites] Client Paint Complete with ${initialFavorites.length} items`)
    }
  }, [initialFavorites])

  return (
    <PageContainer className="py-4 lg:py-4 bg-background min-h-[calc(100vh-4rem)] flex flex-col gap-5 lg:gap-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 lg:gap-6 items-start">
        {/* Left Side: My Favorites */}
        <div className="lg:col-span-7 xl:col-span-8 flex flex-col gap-4">
          <Card className="border-border/50 shadow-sm overflow-hidden flex flex-col h-full">
            <CardHeader className="h-10 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0">
              <div className="flex items-center gap-3">
                <CardTitle className="text-lg">내 즐겨찾기</CardTitle>
                <div className="hidden sm:block">
                  <select 
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="text-xs bg-transparent border-none text-muted-foreground font-medium focus:ring-0 cursor-pointer outline-none hover:text-foreground transition-colors"
                  >
                    <option value="next_broadcast">다음 방송 빠른 순</option>
                    <option value="latest">최근 추가 순</option>
                    <option value="name">가나다 순</option>
                  </select>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="sm:hidden">
                  <select 
                    value={sortOption} 
                    onChange={(e) => setSortOption(e.target.value as SortOption)}
                    className="text-xs bg-transparent border-none text-muted-foreground font-medium focus:ring-0 cursor-pointer outline-none"
                  >
                    <option value="next_broadcast">방송순</option>
                    <option value="latest">최근순</option>
                    <option value="name">이름순</option>
                  </select>
                </div>
                <div className="lg:hidden shrink-0">
                  <FavoriteSearchSheet>
                    <Button size="sm" variant="outline" className="h-8 px-2 flex items-center gap-1">
                      <Plus className="h-4 w-4" />
                      <span className="sr-only sm:not-sr-only">추가</span>
                    </Button>
                  </FavoriteSearchSheet>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-1 pb-3 bg-muted/5">
              <FavoriteList sortOption={sortOption} initialFavorites={initialFavorites} />
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
