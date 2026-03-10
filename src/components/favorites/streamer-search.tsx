"use client"

import * as React from "react"
import { Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchStreamers } from "@/app/actions/streamers"
import { isFavorited } from "@/app/actions/favorites"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FavoriteButton } from "./favorite-button"
import { CreateStreamerModal } from "./create-streamer-modal"

// Debounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function StreamerSearchSection() {
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [favoriteMap, setFavoriteMap] = React.useState<Record<string, boolean>>({})
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)

  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setFavoriteMap({})
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)
    
    try {
      const { data } = await searchStreamers(searchQuery)
      if (data) {
        setResults(data)

        // 각 결과의 즐겨찾기 상태 조회 (병렬)
        // MVP: 결과가 최대 20개이므로 직접 개별 조회, 혹은 나중에 조인으로 최적화
        const favPromises = data.map(async (streamer) => {
          const res = await isFavorited(streamer.id!)
          return { id: streamer.id!, isFavorited: res?.data || false }
        })

        const favResults = await Promise.all(favPromises)
        const newFavMap: Record<string, boolean> = {}
        favResults.forEach(r => {
          newFavMap[r.id] = r.isFavorited
        })
        setFavoriteMap(newFavMap)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  return (
    <div className="w-full flex flex-col gap-4">
      <CreateStreamerModal 
        initialSearchQuery={query} 
        onSuccess={() => {
          if (query.trim()) {
            performSearch(query)
          }
        }} 
      />
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="스트리머 이름으로 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="pl-9 h-11"
        />
      </div>

      <div className="flex flex-col gap-2 min-h-[300px]">
        {isLoading && (
          <div className="py-8 text-center text-sm text-muted-foreground animate-pulse">
            검색 중...
          </div>
        )}

        {!isLoading && hasSearched && results.length === 0 && (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-3 bg-muted/30 rounded-lg border border-dashed">
            <p className="text-sm text-muted-foreground">검색 결과가 없습니다.</p>
          </div>
        )}

        {!isLoading && results.length > 0 && (
          <div className="flex flex-col gap-3">
            <div className="flex flex-col px-1">
              <span className="text-sm font-medium text-muted-foreground">검색 결과 {results.length}건</span>
            </div>
            {results.map((streamer) => (
              <div 
                key={streamer.id} 
                className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10 border">
                    <AvatarImage src={streamer.image_url || undefined} alt={streamer.name} />
                    <AvatarFallback>{streamer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">{streamer.name}</span>
                      {streamer.verified_mark && (
                        <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded-sm dark:bg-green-900/30 dark:text-green-400 font-medium">단독</span>
                      )}
                    </div>
                    {streamer.follower_count !== null && (
                      <span className="text-xs text-muted-foreground">
                        팔로워 {streamer.follower_count.toLocaleString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <FavoriteButton 
                  streamerId={streamer.id!} 
                  initialFavorited={favoriteMap[streamer.id!] || false} 
                />
              </div>
            ))}
          </div>
        )}

        {!hasSearched && !isLoading && (
          <div className="py-12 flex flex-col items-center justify-center text-center gap-4">
            <div className="bg-muted w-12 h-12 rounded-full flex items-center justify-center">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm text-muted-foreground">
              관심있는 스트리머를 검색하고<br/>즐겨찾기로 추가해보세요.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
