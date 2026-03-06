import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Play } from "lucide-react"

// Mock Data
const liveStreamers: any[] = []

export function LiveNowCard() {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            지금 방송 중
            <Badge variant="live" className="animate-pulse">LIVE</Badge>
          </CardTitle>
          <Button variant="ghost" size="sm" className="h-8 text-xs text-muted-foreground">
            새로고침
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        {liveStreamers.length > 0 ? (
          <ScrollArea className="h-[200px] pr-4">
            <div className="flex flex-col gap-3">
              {liveStreamers.map((streamer) => (
                <div key={streamer.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors group cursor-pointer">
                  <div className="relative">
                    <Avatar className="h-10 w-10 border-2 border-red-500">
                      <AvatarImage src={streamer.avatar} alt={streamer.name} />
                      <AvatarFallback>{streamer.name[0]}</AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-1 -right-1 bg-red-500 text-white text-[9px] px-1 rounded-sm border border-background">
                      LIVE
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-semibold text-sm truncate">{streamer.name}</p>
                      <span className="text-xs text-red-500 font-medium">{streamer.viewers}</span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate" title={streamer.title}>
                      {streamer.title}
                    </p>
                  </div>
                  <Button size="icon" variant="ghost" className="h-8 w-8 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play className="h-4 w-4 fill-current" />
                  </Button>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="h-[200px] flex items-center justify-center text-sm text-muted-foreground">
            현재 방송 중인 즐겨찾는 스트리머가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
