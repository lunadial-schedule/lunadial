import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"

export function RecentUpdatesCard() {
  const updates = [
    { id: 1, action: "추가", title: "치지직 1 주말 방송 일정이 추가되었습니다.", time: "10분 전" },
    { id: 2, action: "수정", title: "스트리머 B 합방 시간이 9시로 변경되었습니다.", time: "1시간 전" },
    { id: 3, action: "취소", title: "스트리머 C 정규 방송이 휴방 처리되었습니다.", time: "3시간 전" },
    { id: 4, action: "확인필요", title: "스트리머 D의 일정 정보 확인이 필요합니다.", time: "5시간 전" },
  ]

  const getBadgeVariant = (action: string) => {
    switch (action) {
      case "추가": return "default"
      case "수정": return "changed"
      case "취소": return "canceled"
      case "확인필요": return "destructive"
      default: return "outline"
    }
  }

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="py-4">
        <CardTitle className="text-base font-bold">최근 업데이트</CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4">
        <ScrollArea className="h-[180px] pr-4">
          <div className="flex flex-col gap-4 relative before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border/50">
            {updates.map((item) => (
              <div key={item.id} className="relative flex gap-3 pl-8 group">
                {/* Timeline Dot */}
                <span className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full border-2 border-background bg-primary ring-2 ring-primary/20 group-hover:scale-125 transition-transform" />
                
                <div className="flex flex-col gap-1 w-full">
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant={getBadgeVariant(item.action) as any} className="text-[10px] h-4 px-1.5 rounded-sm">
                      {item.action}
                    </Badge>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">{item.time}</span>
                  </div>
                  <p className="text-xs text-foreground/90 line-clamp-2 leading-relaxed">
                    {item.title}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
