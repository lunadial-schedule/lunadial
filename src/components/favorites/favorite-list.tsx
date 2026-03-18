"use client"

/**
 * 즐겨찾기 스트리머 목록 — 로딩/빈 상태/목록 렌더링
 */

import * as React from "react"
import { getMyFavorites, isFavorited } from "@/app/actions/favorites"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FavoriteButton } from "./favorite-button"
import { Loader2, Edit2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StreamerEditModal } from "./streamer-edit-modal"

export function FavoriteList() {
  const [favorites, setFavorites] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [editingStreamer, setEditingStreamer] = React.useState<any | null>(null)

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

  const displayLimit = 15
  const displayedFavorites = isExpanded ? favorites : favorites.slice(0, displayLimit)

  return (
    <div className="flex flex-col gap-0 border border-border/50 rounded-lg overflow-hidden bg-background max-h-[800px] overflow-y-auto">
      {displayedFavorites.map((fav) => {
        const streamer = fav.streamers
        return (
          <div 
            key={fav.id}
            className="flex items-center gap-3 p-[10px] sm:p-3 border-b border-border/50 last:border-0 hover:bg-muted/30 transition-all group"
          >
            <Avatar className="h-9 w-9 sm:h-10 sm:w-10 border border-border/40 shrink-0">
              <AvatarImage src={streamer.image_url || undefined} alt={streamer.name} />
              <AvatarFallback>{streamer.name[0]}</AvatarFallback>
            </Avatar>
            <div className="flex flex-col flex-1 min-w-0 justify-center">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{streamer.name}</span>
                {streamer.verified_mark && (
                  <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded-sm dark:bg-green-900/30 dark:text-green-400 font-medium shrink-0">단독</span>
                )}
              </div>
              {streamer.follower_count !== null && (
                <span className="text-[10px] sm:text-[11px] text-muted-foreground truncate w-full block">
                  팔로워 {streamer.follower_count.toLocaleString()}
                </span>
              )}
            </div>
            
            <div className="flex items-center gap-1 shrink-0">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-muted-foreground hover:text-foreground opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity"
                onClick={() => setEditingStreamer(streamer)}
              >
                <Edit2 className="h-4 w-4" />
                <span className="sr-only">정보 수정</span>
              </Button>
              <FavoriteButton 
                streamerId={streamer.id} 
                initialFavorited={true}
                onFavoriteChange={(isFav) => {
                  if (!isFav) {
                    setFavorites(prev => prev.filter(f => f.streamers.id !== streamer.id))
                  }
                }}
              />
            </div>
          </div>
        )
      })}

      {favorites.length > displayLimit && !isExpanded && (
        <div className="p-2 border-t border-border/50 bg-muted/5 flex justify-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsExpanded(true)}
            className="w-full text-xs text-muted-foreground hover:text-foreground"
          >
            {favorites.length - displayLimit}명 더 보기
          </Button>
        </div>
      )}

      {editingStreamer && (
        <StreamerEditModal 
          open={!!editingStreamer} 
          onOpenChange={(open) => !open && setEditingStreamer(null)} 
          streamer={editingStreamer} 
        />
      )}
    </div>
  )
}
