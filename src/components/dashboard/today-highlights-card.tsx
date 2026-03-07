"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowRight, Clock, Info } from "lucide-react"
import Link from "next/link"

export function TodayHighlightsCard() {
  const highlights: any[] = []

  return (
    <Card className="border-border/50 shadow-sm flex-1">
      <CardHeader className="py-0">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-bold">오늘의 하이라이트</CardTitle>
          <Button variant="ghost" size="sm" asChild className="h-8 gap-1 text-xs text-muted-foreground">
            <Link href="/calendar?date=today&view=day">
              <span>전체보기</span>
              <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="px-1 pb-4">
        <div className="flex flex-col gap-2">
          {highlights.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 rounded-xl border border-border/40 bg-card hover:bg-muted/30 transition-colors shadow-sm cursor-pointer group">
              <div className="flex items-center gap-3 overflow-hidden">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                  <Clock className="h-4 w-4" />
                </div>
                <div className="flex-1 overflow-hidden min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold truncate group-hover:text-primary transition-colors">
                      {item.title}
                    </span>
                    {item.isChanged && (
                       <Badge variant="changed" className="h-4 px-1 text-[9px]">변경됨</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground mr-2">
                    <span className="font-medium text-foreground/80">{item.time}</span>
                    <span>•</span>
                    <span className="truncate">{item.streamer}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
          {highlights.length === 0 && (
            <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Info className="h-5 w-5 opacity-50" />
              <p>오늘 예정된 주요 일정이 없습니다.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
