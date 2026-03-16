"use client"

/**
 * 스트리머 검색 섹션 — 이름 검색 + 결과 목록 + 즐겨찾기 추가
 */

import * as React from "react"
import { Search, Edit2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { searchStreamers } from "@/app/actions/streamers"
import { getMyFavorites } from "@/app/actions/favorites"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { FavoriteButton } from "./favorite-button"
import { CreateStreamerModal } from "./create-streamer-modal"
import { StreamerEditModal } from "./streamer-edit-modal"
import { Button } from "@/components/ui/button"

// Debounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

export function StreamerSearchSection({ autoFocus }: { autoFocus?: boolean }) {
  const [query, setQuery] = React.useState("")
  const debouncedQuery = useDebounce(query, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [favoriteSet, setFavoriteSet] = React.useState<Set<string>>(new Set())
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasSearched, setHasSearched] = React.useState(false)
  const [editingStreamer, setEditingStreamer] = React.useState<any | null>(null)

  const loadFavorites = React.useCallback(async () => {
    try {
      const { data } = await getMyFavorites()
      if (data) {
        const ids = data.map(f => {
          const s = f.streamers as any
          return Array.isArray(s) ? s[0]?.id : s?.id
        }).filter(Boolean)
        setFavoriteSet(new Set(ids))
      }
    } catch (e) {
      console.error(e)
    }
  }, [])

  React.useEffect(() => {
    loadFavorites()
    window.addEventListener("favoritesUpdated", loadFavorites)
    return () => window.removeEventListener("favoritesUpdated", loadFavorites)
  }, [loadFavorites])

  const searchIdRef = React.useRef(0)

  const performSearch = React.useCallback(async (searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([])
      setHasSearched(false)
      return
    }

    setIsLoading(true)
    setHasSearched(true)
    
    const currentSearchId = ++searchIdRef.current

    try {
      const { data } = await searchStreamers(searchQuery)
      
      if (currentSearchId !== searchIdRef.current) return

      if (data) {
        setResults(data)
      }
    } catch (e) {
      if (currentSearchId === searchIdRef.current) {
        console.error(e)
      }
    } finally {
      if (currentSearchId === searchIdRef.current) {
        setIsLoading(false)
      }
    }
  }, [])

  React.useEffect(() => {
    performSearch(debouncedQuery)
  }, [debouncedQuery, performSearch])

  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (autoFocus && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [autoFocus])

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
          ref={inputRef}
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
                
                <div className="flex items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => setEditingStreamer(streamer)}
                  >
                    <Edit2 className="h-4 w-4" />
                    <span className="sr-only">정보 수정</span>
                  </Button>
                  <FavoriteButton 
                    streamerId={streamer.id!} 
                    initialFavorited={favoriteSet.has(streamer.id!)} 
                  />
                </div>
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
