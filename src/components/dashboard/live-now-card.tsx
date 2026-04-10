"use client"

/**
 * 현재 라이브 카드 — 치지직 인기 라이브 스트림 TOP 10 표시
 */

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, RefreshCw } from "lucide-react"
import { formatViewerCount, getRelativeTimeString } from "@/lib/utils"

interface LiveStreamer {
  channelId: string
  channelName: string
  profileImageUrl: string
  liveTitle: string
  viewerCount: number
  liveUrl: string
}

export function LiveNowCard() {
  const [liveStreamers, setLiveStreamers] = useState<LiveStreamer[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isError, setIsError] = useState(false)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [relativeTime, setRelativeTime] = useState<string>('방금 전')

  const fetchLiveStreamers = async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const res = await fetch('/api/chzzk/live/top')
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setLiveStreamers(data.items || [])
      if (data.updatedAt) {
        setUpdatedAt(data.updatedAt)
        setRelativeTime(getRelativeTimeString(data.updatedAt))
      }
    } catch (err) {
      console.error(err)
      setIsError(true)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchLiveStreamers()
  }, [])

  useEffect(() => {
    if (!updatedAt) return
    
    // 1분마다 표시 시간 갱신
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTimeString(updatedAt))
    }, 60000)
    
    // 즉각 반영
    setRelativeTime(getRelativeTimeString(updatedAt))
    
    return () => clearInterval(interval)
  }, [updatedAt])

  return (
    <Card className="border-border/50 flex flex-col lg:h-[650px]">
      <CardHeader className="h-10 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0 space-y-0">
        <div className="flex items-center justify-between gap-2 w-full">
          <CardTitle className="text-[15px] font-bold flex items-center gap-1.5 whitespace-nowrap m-0">
            지금 방송 중
            <Badge variant="live" className="animate-pulse h-5 flex items-center px-1.5 text-[10px] ml-0.5 m-0">LIVE</Badge>
          </CardTitle>
          <div className="flex items-center">
            {!isLoading && updatedAt && (
              <span className="text-[11px] text-muted-foreground font-medium mr-2">{relativeTime}</span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md shrink-0"
              onClick={fetchLiveStreamers}
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col">
        {isLoading ? (
          <div className="flex-1 min-h-0 overflow-hidden flex flex-col justify-center gap-2.5 p-3">
             {[1,2,3,4,5,6,7,8,9,10].map(i => (
               <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded-lg animate-pulse">
                 <div className="h-8 w-8 bg-muted rounded-full shrink-0" />
                 <div className="flex-1 space-y-1.5 py-0.5">
                   <div className="h-3.5 bg-muted rounded w-3/4" />
                   <div className="h-2.5 bg-muted rounded w-1/2" />
                 </div>
               </div>
             ))}
          </div>
        ) : isError ? (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground p-4">
            <p>라이브 정보를 불러오지 못했어요</p>
            <Button variant="outline" size="sm" onClick={fetchLiveStreamers}>
              재시도
            </Button>
          </div>
        ) : liveStreamers.length > 0 ? (
          <ScrollArea className="flex-1 min-h-0">
            <div className="flex flex-col pr-3">
              {liveStreamers.map((streamer, index) => (
                <div 
                  key={streamer.channelId} 
                  className="w-full grid grid-cols-[16px_36px_1fr_68px] sm:grid-cols-[16px_36px_1fr_72px] gap-2.5 sm:gap-3 py-2 pl-3 pr-2 border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors group cursor-pointer items-center"
                  onClick={() => window.open(streamer.liveUrl, "_blank", "noopener,noreferrer")}
                >
                  {/* Rank */}
                  <div className={`text-center font-bold text-[13px] justify-self-center sm:text-sm ${index < 3 ? 'text-primary' : 'text-muted-foreground'}`}>
                    {index + 1}
                  </div>
                  
                  {/* Avatar */}
                  <div className="flex items-center justify-center">
                    <Avatar className={`h-8 w-8 sm:h-9 sm:w-9 border-2 ${index < 3 ? 'border-primary/80' : 'border-transparent'}`}>
                      <AvatarImage src={streamer.profileImageUrl} alt={streamer.channelName} />
                      <AvatarFallback>{streamer.channelName[0]}</AvatarFallback>
                    </Avatar>
                  </div>

                  {/* Text Content */}
                  <div className="flex flex-col min-w-0 justify-center gap-0.5">
                    <p className="font-semibold text-[13px] leading-tight truncate group-hover:text-primary transition-colors">{streamer.channelName}</p>
                    <p className="text-[11px] text-muted-foreground truncate" title={streamer.liveTitle}>
                      {streamer.liveTitle}
                    </p>
                  </div>

                  {/* Viewer Count */}
                  <div className="flex items-center justify-end gap-1.5 w-full">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-[pulse_2s_ease-in-out_infinite] shrink-0" />
                    <span className="text-[10px] sm:text-[11px] font-bold text-foreground/90 whitespace-nowrap text-right tracking-tight">
                      {formatViewerCount(streamer.viewerCount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground p-4">
            현재 방송 중인 채널이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
