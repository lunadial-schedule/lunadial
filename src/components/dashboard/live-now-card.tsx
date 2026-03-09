"use client"

import { useEffect, useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play, RefreshCw } from "lucide-react"
import { formatViewerCount } from "@/lib/utils"

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

  const fetchLiveStreamers = async () => {
    setIsLoading(true)
    setIsError(false)
    try {
      const res = await fetch('/api/chzzk/live/top')
      if (!res.ok) throw new Error('Fetch failed')
      const data = await res.json()
      setLiveStreamers(data.items || [])
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

  return (
    <Card className="h-[468px] border-border/50 shadow-sm flex flex-col">
      <CardHeader className="py-1 shrink-0">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-base font-bold flex items-center gap-2 whitespace-nowrap shrink-0">
            지금 방송 중
            <Badge variant="live" className="animate-pulse">LIVE</Badge>
          </CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 text-[10px] sm:text-xs text-muted-foreground shrink-0 px-2"
            onClick={fetchLiveStreamers}
            disabled={isLoading}
          >
            <RefreshCw className={`w-3 h-3 sm:mr-1 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">새로고침</span>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4 flex-1">
        {isLoading ? (
          <div className="h-[200px] flex flex-col gap-3">
             {[1,2,3,4,5].map(i => (
               <div key={i} className="flex items-start gap-3 p-2 rounded-lg animate-pulse">
                 <div className="h-10 w-10 bg-muted rounded-full shrink-0" />
                 <div className="flex-1 space-y-2 py-1">
                   <div className="h-4 bg-muted rounded w-3/4" />
                   <div className="h-3 bg-muted rounded w-1/2" />
                 </div>
               </div>
             ))}
          </div>
        ) : isError ? (
          <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
            <p>라이브 정보를 불러오지 못했어요</p>
            <Button variant="outline" size="sm" onClick={fetchLiveStreamers}>
              재시도
            </Button>
          </div>
        ) : liveStreamers.length > 0 ? (
          <ScrollArea className="h-[330px] pr-4">
            <div className="flex flex-col gap-3">
              {liveStreamers.map((streamer) => (
                  <div 
                    key={streamer.channelId} 
                    className="w-full grid grid-cols-[44px_1fr_auto] items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer"
                  onClick={() => window.open(streamer.liveUrl, "_blank", "noopener,noreferrer")}
                >
                  {/* 1. Avatar (44px Width) */}
                  <div className="relative shrink-0">
                    <Avatar className="h-10 w-10 border-2 border-red-500">
                      <AvatarImage src={streamer.profileImageUrl} alt={streamer.channelName} />
                      <AvatarFallback>{streamer.channelName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[9px] px-1 rounded-sm border border-background font-bold tracking-tighter">
                      LIVE
                    </div>
                  </div>

                  {/* 2. Text Content (1fr, min-w-0 for ellipsis to work) */}
                  <div className="flex flex-col min-w-0 pt-0.5 gap-0.5 pr-1">
                    <p className="font-semibold text-sm truncate">{streamer.channelName}</p>
                    <p className="text-xs text-muted-foreground truncate" title={streamer.liveTitle}>
                      {streamer.liveTitle}
                    </p>
                  </div>

                  {/* 3. Viewer Count (Auto width, right aligned) */}
                  <div className="flex flex-col items-end shrink-0 pt-0.5 min-w-[50px]">
                    <span className="text-xs text-red-500 font-medium whitespace-nowrap">
                      {formatViewerCount(streamer.viewerCount)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            현재 방송 중인 채널이 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
