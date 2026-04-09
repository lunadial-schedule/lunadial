"use client"

/**
 * 곧 시작 카드 — 다음 방송 예정 일정 표시
 *
 * 서버에서 전달받은 초기 데이터(initialEvents)를 사용하여
 * 초기 로드 시 추가 fetch 없이 즉시 렌더한다.
 */;

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter, addHours, formatDistanceToNowStrict } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import type { HomeSchedule } from "@/app/actions/schedules";
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer";
import { CATEGORY_LIST } from "@/config/categories";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { cn } from "@/lib/utils";
import type { Schedule } from "@/app/actions/schedules";

interface UpNextCardProps {
  initialEvents?: HomeSchedule[];
}

export function UpNextCard({ initialEvents = [] }: UpNextCardProps) {
  const [events, setEvents] = React.useState<HomeSchedule[]>(initialEvents);
  const [isLoading, setIsLoading] = React.useState(initialEvents.length === 0 ? false : false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<Schedule | null>(null);

  const handleEventClick = (event: HomeSchedule) => {
    setSelectedEvent(event as unknown as Schedule);
    setIsDetailOpen(true);
  };

  // 서버에서 초기 데이터가 전달되므로 클라이언트 fetch는 불필요
  // schedulesUpdated 이벤트에만 반응하여 데이터 갱신
  React.useEffect(() => {
    const handleUpdate = async () => {
      const { getHomeSchedules } = await import("@/app/actions/schedules");
      const now = new Date();
      const end = addHours(now, 24);
      const { data } = await getHomeSchedules(now, end);
      if (data) {
        const upcoming = data.filter(e => isAfter(parseISO(e.start_time), now) && e.status !== "canceled").slice(0, 5);
        setEvents(upcoming);
      }
    };
    
    window.addEventListener("schedulesUpdated", handleUpdate);
    return () => window.removeEventListener("schedulesUpdated", handleUpdate);
  }, []);

  return (
    <>
      <Card className="flex flex-col border-border/50 shadow-sm bg-card overflow-hidden h-[480px]">
        <CardHeader className="h-10 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0 space-y-0">
          <CardTitle className="text-[15px] font-bold flex items-center gap-1.5 m-0 hover:text-primary transition-colors cursor-pointer" onClick={() => window.location.href = "/calendar"}>
            <Clock className="h-4 w-4 text-primary" />
            곧 시작
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] px-1.5 h-4.5 font-medium whitespace-nowrap flex items-center m-0">다음 방송 예정</Badge>
        </CardHeader>
        <CardContent className="p-0 flex-1 flex flex-col min-h-0">
          {isLoading ? (
            <div className="flex-1 flex items-center justify-center p-4 text-center text-xs text-muted-foreground animate-pulse">
              일정을 불러오는 중입니다...
            </div>
          ) : events.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-6 text-center bg-muted/5">
              <span className="text-sm font-medium text-muted-foreground mb-1">다가오는 일정이 없습니다</span>
              <span className="text-[11px] text-muted-foreground/70 mb-4">현재로부터 24시간 이내에 예정된 일정이 없어요.</span>
              <Button variant="outline" size="sm" asChild className="h-8 text-xs rounded-md">
                <Link href="/calendar">전체 캘린더 보기</Link>
              </Button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col p-2.5 md:p-3 gap-1.5 min-h-0">
              {events.map((event) => {
                const now = new Date();
                const isWithinOneHour = event.status !== "canceled" && isAfter(parseISO(event.start_time), now) && isAfter(addHours(now, 1), parseISO(event.start_time));
                return (
                  <div 
                    key={event.id} 
                    className={cn(
                      "group flex items-center px-3 py-2 rounded-xl border border-border/60 hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer relative shrink-0 min-h-[50px]",
                      isWithinOneHour ? "bg-amber-500/5 dark:bg-amber-500/10" : "bg-card"
                    )}
                    onClick={() => handleEventClick(event)}
                  >
                    <div className="absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full overflow-hidden flex flex-col">
                      {event.categories && event.categories.length > 0 ? (
                        [...event.categories]
                          .sort((a, b) => {
                            const idxA = CATEGORY_LIST.findIndex(c => c.id === a);
                            const idxB = CATEGORY_LIST.findIndex(c => c.id === b);
                            return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
                          })
                          .map((cat, idx) => {
                          const styleCat = CATEGORY_LIST.find(c => c.id === cat) || CATEGORY_LIST[0];
                          return <div key={idx} className={cn("flex-1", styleCat.color)} />;
                        })
                      ) : (
                        <div className={cn("flex-1", CATEGORY_LIST[0].color)} />
                      )}
                    </div>
                    
                    <div className="w-[56px] shrink-0 flex flex-col items-start justify-center pr-2 pl-1 border-r border-border/50">
                      <span className={cn(
                        "text-[13px] font-bold",
                        isWithinOneHour ? 'text-primary' : 'text-foreground'
                      )}>
                        {event.is_all_day ? "종일" : format(parseISO(event.start_time), "HH:mm", { locale: ko })}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col justify-center gap-[2px] pl-3">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          "font-bold text-sm truncate group-hover:text-primary transition-colors flex items-center gap-1",
                          isWithinOneHour && "text-foreground"
                        )}>
                          {event.streamer}
                          {event.streamers?.verified_mark && <VerifiedBadge size={14} />}
                        </span>
                        {event.status === "canceled" && <span className="bg-muted text-muted-foreground shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm font-medium">취소됨</span>}
                        {event.status === "changed" && <span className="bg-primary/10 text-primary shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm font-medium">변경됨</span>}
                        {isWithinOneHour && <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold tracking-tight bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">곧 시작</span>}
                      </div>
                      <span className="text-[11px] text-muted-foreground truncate flex items-center">
                        {event.title}
                      </span>
                    </div>
                    <div className="shrink-0 flex items-center justify-end h-full pl-2 min-w-[64px] text-right">
                      {!event.is_all_day ? (
                        <span className={cn(
                          "text-[11px] font-medium whitespace-nowrap",
                          isWithinOneHour ? 'text-primary' : 'text-muted-foreground'
                        )}>
                          {formatDistanceToNowStrict(parseISO(event.start_time), { locale: ko, addSuffix: true })}
                        </span>
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary transition-colors" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
        <CardFooter className="p-0 shrink-0">
          <Button variant="ghost" size="sm" asChild className="w-full h-8.5 text-xs text-muted-foreground gap-1 rounded-none border-t border-border/50 hover:bg-muted/30">
            <Link href="/calendar">
              전체 보기
              <ChevronRight className="h-3 w-3 inline-block ml-0.5" />
            </Link>
          </Button>
        </CardFooter>
      </Card>
      
      <ScheduleDetailDrawer 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        schedule={selectedEvent}
      />
    </>
  );
}
