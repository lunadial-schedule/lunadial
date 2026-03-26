"use client"

/**
 * 즐겨찾기 스트리머 목록 — 로딩/빈 상태/목록 렌더링/정렬/다음방송 표시
 */

import * as React from "react"
import { getMyFavorites, isFavorited } from "@/app/actions/favorites"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FavoriteButton } from "./favorite-button"
import { Loader2, Edit2, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { StreamerEditModal } from "./streamer-edit-modal"
import { format, isToday, isTomorrow, differenceInHours, differenceInMinutes, parseISO } from "date-fns"

function formatNextBroadcast(schedule: any) {
  if (!schedule) return "예정 없음";
  const start = parseISO(schedule.start_time);
  
  if (schedule.is_all_day) {
    if (isToday(start)) return "오늘 종일";
    if (isTomorrow(start)) return "내일 종일";
    return `${format(start, 'M/d')} 종일`;
  }

  const timeStr = format(start, 'HH:mm');
  if (isToday(start)) {
    const diffH = differenceInHours(start, new Date());
    const diffM = differenceInMinutes(start, new Date());
    let relative = "";
    if (diffH > 0) relative = ` · ${diffH}시간 후`;
    else if (diffM >= 0) relative = ` · ${diffM}분 후`;
    else relative = ` · 진행중`;
    
    return `오늘 ${timeStr}${relative}`;
  }
  if (isTomorrow(start)) {
    return `내일 ${timeStr}`;
  }
  return `${format(start, 'M/d')} ${timeStr}`;
}

type SortOption = 'next_broadcast' | 'latest' | 'name';

export function FavoriteList() {
  const [favorites, setFavorites] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [isExpanded, setIsExpanded] = React.useState(false)
  const [editingStreamer, setEditingStreamer] = React.useState<any | null>(null)
  const [sortOption, setSortOption] = React.useState<SortOption>('next_broadcast')

  const loadFavorites = React.useCallback(async () => {
    setIsLoading(true)
    setError(null)
    const { data, error } = await getMyFavorites()
    if (error) {
      setError(error)
    } else if (data) {
      setFavorites(data)
    }
    setIsLoading(false)
  }, [])

  React.useEffect(() => {
    loadFavorites()
    
    const handleFavoritesUpdated = () => {
      loadFavorites()
    }
    
    window.addEventListener("favoritesUpdated", handleFavoritesUpdated)
    return () => {
      window.removeEventListener("favoritesUpdated", handleFavoritesUpdated)
    }
  }, [loadFavorites])

  const sortedFavorites = React.useMemo(() => {
    return [...favorites].sort((a, b) => {
      if (sortOption === 'name') {
        const nameA = a.streamers.name || "";
        const nameB = b.streamers.name || "";
        return nameA.localeCompare(nameB, 'ko-KR');
      } else if (sortOption === 'latest') {
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      } else {
        // next_broadcast
        const tA = a.next_broadcast ? new Date(a.next_broadcast.start_time).getTime() : Infinity;
        const tB = b.next_broadcast ? new Date(b.next_broadcast.start_time).getTime() : Infinity;
        if (tA === tB) {
           return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        }
        return tA - tB;
      }
    });
  }, [favorites, sortOption]);

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
  const displayedFavorites = isExpanded ? sortedFavorites : sortedFavorites.slice(0, displayLimit)

  return (
    <div className="flex flex-col gap-2">
      <div className="flex justify-end px-1">
        <select 
          value={sortOption} 
          onChange={(e) => setSortOption(e.target.value as SortOption)}
          className="text-xs bg-transparent border-none text-muted-foreground font-medium focus:ring-0 cursor-pointer outline-none"
        >
          <option value="next_broadcast">다음 방송 빠른 순</option>
          <option value="latest">최근 추가 순</option>
          <option value="name">가나다 순</option>
        </select>
      </div>
      <div className="flex flex-col gap-0 border border-border/50 rounded-lg overflow-hidden bg-background max-h-[800px] overflow-y-auto">
        {displayedFavorites.map((fav) => {
          const streamer = fav.streamers
          const nextBroadcastInfo = formatNextBroadcast(fav.next_broadcast)
          const hasSchedule = !!fav.next_broadcast
          
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
                    <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded-sm dark:bg-green-900/30 dark:text-green-400 font-medium shrink-0">파트너</span>
                  )}
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className={`w-3 h-3 ${hasSchedule ? 'text-primary/70' : 'text-muted-foreground/50'}`} />
                  <span className={`text-[11px] sm:text-xs truncate block ${hasSchedule ? 'text-foreground/80 font-medium' : 'text-muted-foreground'}`}>
                    {nextBroadcastInfo}
                  </span>
                </div>
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
    </div>
  )
}
