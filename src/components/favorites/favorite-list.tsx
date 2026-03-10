"use client"

import * as React from "react"
import { getMyFavorites, isFavorited } from "@/app/actions/favorites"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FavoriteButton } from "./favorite-button"
import { Loader2 } from "lucide-react"

export function FavoriteList() {
  const [favorites, setFavorites] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await getMyFavorites()
    if (error) {
      setError(error)
    } else if (data) {
      // data: { id, created_at, streamers: { id, channel_id, name, ... } }[]
      setFavorites(data)
    }
    setIsLoading(false)
  }, [])

  React.useEffect(() => {
    loadFavorites()
    
    // 타 컴포넌트(검색 버튼, 추가 모달)에서 발생시킨 이벤트 구독
    const handleFavoritesUpdated = () => {
      loadFavorites()
    }
    
    window.addEventListener("favoritesUpdated", handleFavoritesUpdated)
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated)
    }
  }, [loadFavorites])

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">즐겨찾기 목록을 불러오는 중...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-8 text-center text-sm text-destructive">
        {error}
      </div>
    )
  }

  if (favorites.length === 0) {
    return (
      <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-muted/20 border border-dashed rounded-lg">
        <p className="text-muted-foreground text-sm">아직 즐겨찾기한 스트리머가 없습니다.</p>
        <p className="text-muted-foreground text-xs">검색을 통해 관심있는 스트리머를 추가해보세요!</p>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
      {favorites.map((fav) => {
        const streamer = fav.streamers
        return (
          <div 
            key={fav.id}
            className="flex items-center gap-3 p-3 rounded-lg border bg-card shadow-sm hover:shadow-md transition-all group"
          >
            <Avatar className="h-12 w-12 border">
              <AvatarImage src={streamer.image_url || undefined} alt={streamer.name} />
              <AvatarFallback>{streamer.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate">{streamer.name}</span>
                {streamer.verified_mark && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded-sm dark:bg-green-900/30 dark:text-green-400 font-medium shrink-0">단독</span>
                )}
              </div>
              <span className="text-xs text-muted-foreground truncate w-full block">
                {streamer.follower_count !== null 
                  ? `팔로워 ${streamer.follower_count.toLocaleString()}`
                  : '팔로워 정보 없음'
                }
              </span>
            </div>
            
            <FavoriteButton 
              streamerId={streamer.id} 
              initialFavorited={true}
              onFavoriteChange={(isFav) => {
                if (!isFav) {
                  // 낙관적 업데이트로 목록에서 바로 제거할 수도 있음: 
                  setFavorites(prev => prev.filter(f => f.streamers.id !== streamer.id))
                }
              }}
              className="md:opacity-0 md:group-hover:opacity-100 transition-opacity"
            />
          </div>
        )
      })}
    </div>
  )
}
