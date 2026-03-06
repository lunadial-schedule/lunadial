"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { format, parseISO, isAfter, addHours } from "date-fns";
import { ko } from "date-fns/locale";
import Link from "next/link";
import { getSchedules, type Schedule } from "@/app/actions/schedules";
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer";

export function UpNextCard() {
  const [events, setEvents] = React.useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<Schedule | null>(null);

  const handleEventClick = (event: Schedule) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  React.useEffect(() => {
    async function loadSchedules() {
      setIsLoading(true);
      const now = new Date();
      const end = addHours(now, 24);
      const { data } = await getSchedules(now, end);
      if (data) {
        const upcoming = data.filter(e => isAfter(parseISO(e.start_time), now)).slice(0, 3);
        setEvents(upcoming);
      }
      setIsLoading(false);
    }
    loadSchedules();
  }, []);
  return (
    <>
      <Card className="flex flex-col border-border/50 shadow-sm bg-card overflow-hidden">
      <CardHeader className="py-3 px-4 sm:px-6 border-b">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-bold flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            곧 시작
          </CardTitle>
          <Badge variant="secondary" className="text-[10px] px-1.5 font-normal">2시간 이내</Badge>
        </div>
      </CardHeader>
      <CardContent className="p-0 flex-1">
        <div className="flex flex-col">
          {isLoading ? (
            <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">일정을 불러오는 중입니다...</div>
          ) : events.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center bg-muted/10">
              <span className="text-sm font-medium text-muted-foreground mb-1">다가오는 일정이 없습니다</span>
              <span className="text-xs text-muted-foreground/70 mb-4">현재로부터 24시간 이내에 예정된 일정이 없어요.</span>
              <Button variant="outline" size="sm" asChild className="h-8 text-xs px-3">
                <Link href="/calendar">전체 캘린더 보기</Link>
              </Button>
            </div>
          ) : (
            events.map((event) => (
              <div 
                key={event.id} 
                className="flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/10 transition-colors cursor-pointer group"
                onClick={() => handleEventClick(event)}
              >
                <div className="w-16 shrink-0 pt-0.5 text-right">
                  <span className="text-xs font-semibold text-primary">{event.is_all_day ? "종일" : format(parseISO(event.start_time), "a h:mm", { locale: ko })}</span>
                </div>
                <div className="flex-1 min-w-0 flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm truncate group-hover:text-primary transition-colors">{event.title}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{event.streamer}</span>
                    {event.status === "canceled" && <Badge variant="canceled" className="h-[14px] px-1 text-[9px] font-bold tracking-wider">CANCELED</Badge>}
                    {event.status === "changed" && <Badge variant="changed" className="h-[14px] px-1 text-[9px] font-bold tracking-wider">CHANGED</Badge>}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
      <CardFooter className="p-2 border-t bg-muted/20">
        <Button variant="ghost" size="sm" asChild className="w-full text-xs text-muted-foreground gap-1">
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
