"use client"

import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Search, Trash2, Bell, BellOff, ArrowLeft, Star } from "lucide-react"
import { useState, useEffect } from "react"
import Link from "next/link"
import { toast } from "sonner"

interface FavoriteStreamer {
  id: string
  name: string
  category: string
  notificationsEnabled: boolean
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<FavoriteStreamer[]>([])
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    // 로컬 스토리지에서 즐겨찾기 데이터 로드
    const saved = localStorage.getItem("lunadial_favorites")
    if (saved) {
      try {
        setFavorites(JSON.parse(saved))
      } catch (e) {
        console.error("Failed to parse favorites", e)
      }
    } else {
      // 초기 세팅용 더미 데이터
      const initial: FavoriteStreamer[] = [
        { id: "1", name: "치지직 1", category: "종합게임", notificationsEnabled: true },
        { id: "2", name: "치지직 2", category: "저챗", notificationsEnabled: false },
        { id: "3", name: "아프리카 1", category: "버튜버", notificationsEnabled: true },
      ]
      setFavorites(initial)
      localStorage.setItem("lunadial_favorites", JSON.stringify(initial))
    }
  }, [])

  const saveFavorites = (newFavorites: FavoriteStreamer[]) => {
    setFavorites(newFavorites)
    localStorage.setItem("lunadial_favorites", JSON.stringify(newFavorites))
  }

  const handleDelete = (id: string) => {
    const newFavorites = favorites.filter(f => f.id !== id)
    saveFavorites(newFavorites)
    toast.success("즐겨찾기가 삭제되었습니다.")
  }

  const toggleNotification = (id: string) => {
    const newFavorites = favorites.map(f => {
      if (f.id === id) {
        const newState = !f.notificationsEnabled
        toast(newState ? "알림이 켜졌습니다." : "알림이 꺼졌습니다.")
        return { ...f, notificationsEnabled: newState }
      }
      return f
    })
    saveFavorites(newFavorites)
  }

  const filteredFavorites = favorites.filter(f => 
    f.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const isPro = false // TODO: 실제 플랜 연동 필요
  const maxFavorites = isPro ? Infinity : 10

  return (
    <PageContainer className="py-8 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl mx-auto space-y-8">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild className="h-8 w-8 -ml-2">
            <Link href="/calendar">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">즐겨찾기 관리</h1>
            <p className="text-muted-foreground mt-1">
              관심 있는 스트리머를 추가하고 일정을 캘린더에서 한눈에 모아보세요.
            </p>
          </div>
        </div>

        <Card className="border-border/50 shadow-sm">
          <div className="p-4 border-b bg-muted/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                type="search"
                placeholder="즐겨찾는 스트리머 검색..."
                className="pl-9 bg-background h-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <div className="text-sm font-medium flex items-center gap-2 shrink-0">
              <span className="text-muted-foreground">즐겨찾기:</span>
              <span className={`${favorites.length >= maxFavorites ? 'text-destructive' : 'text-foreground'}`}>
                {favorites.length} <span className="text-muted-foreground font-normal">/ {isPro ? '무제한' : maxFavorites}</span>
              </span>
              {!isPro && favorites.length >= 8 && (
                <Button variant="link" size="sm" asChild className="h-auto p-0 ml-2 text-amber-600">
                  <Link href="/pro">무제한으로 늘리기</Link>
                </Button>
              )}
            </div>
          </div>
          
          <CardContent className="p-0">
            {filteredFavorites.length === 0 ? (
              <div className="p-12 text-center flex flex-col items-center">
                <Star className="h-10 w-10 text-muted-foreground mb-4 opacity-20" />
                <h3 className="text-lg font-medium text-foreground">스트리머가 없습니다</h3>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  {searchQuery ? "검색 결과와 일치하는 스트리머가 없습니다." : "상단에서 스트리머를 찾아 추가해보세요."}
                </p>
              </div>
            ) : (
              <div className="divide-y">
                {filteredFavorites.map((streamer) => (
                  <div key={streamer.id} className="flex items-center justify-between p-4 hover:bg-muted/5 transition-colors">
                    <div className="flex items-center gap-3 w-full min-w-0 pr-4">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="font-semibold text-primary">{streamer.name.charAt(0)}</span>
                      </div>
                      <div className="min-w-0 truncate">
                        <p className="font-semibold truncate">{streamer.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{streamer.category}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant={streamer.notificationsEnabled ? "default" : "secondary"}
                        size="sm"
                        className="h-8 gap-1.5 px-3"
                        onClick={() => toggleNotification(streamer.id)}
                      >
                        {streamer.notificationsEnabled ? (
                          <><Bell className="h-3.5 w-3.5" /><span className="hidden sm:inline">알림 켜짐</span></>
                        ) : (
                          <><BellOff className="h-3.5 w-3.5 text-muted-foreground" /><span className="hidden sm:inline text-muted-foreground">알림 꺼짐</span></>
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleDelete(streamer.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span className="sr-only">삭제</span>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  )
}
