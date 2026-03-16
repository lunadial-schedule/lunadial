"use client"

/**
 * 주간 캘린더 카드
 */;

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react";
import { addDays, startOfWeek, format, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { getSchedules, type Schedule } from "@/app/actions/schedules";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer";
import { useRouter } from "next/navigation";
import Link from "next/link";

export function WeeklyCalendarCard() {
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<Schedule | null>(null);
  
  const startDate = React.useMemo(() => startOfWeek(currentDate, { weekStartsOn: 0 }), [currentDate]); // 일요일 시작

  const weekDays = React.useMemo(() => Array.from({ length: 7 }).map((_, i) => addDays(startDate, i)), [startDate]);

  const nextWeek = () => setCurrentDate(addDays(currentDate, 7));
  const prevWeek = () => setCurrentDate(addDays(currentDate, -7));
  const goToday = () => setCurrentDate(new Date());

  const handleEventClick = (event: Schedule) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const loadSchedules = React.useCallback(async () => {
    setIsLoading(true);
    const endDate = addDays(startDate, 7);
    const { data } = await getSchedules(startDate, endDate);
    if (data) {
      setEvents(data);
    }
    setIsLoading(false);
  }, [startDate]);

  React.useEffect(() => {
    loadSchedules();
    window.addEventListener("schedulesUpdated", loadSchedules);
    return () => window.removeEventListener("schedulesUpdated", loadSchedules);
  }, [loadSchedules]);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => isSameDay(parseISO(e.start_time), day));
  };

  return (
    <>
      <Card className="flex flex-col h-[734px] border-border/50 shadow-sm bg-card overflow-hidden">
      {/* Header & Controls */}
      <CardHeader className="py-1 px-4 sm:px-6 border-b">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <CardTitle className="text-xl font-bold flex items-center gap-2">
            <CalendarIcon className="h-5 w-5 text-primary" />
            이번 주 일정
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={goToday} className="rounded-full">오늘</Button>
            <div className="flex items-center bg-muted/50 rounded-full p-0.5">
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={prevWeek}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm font-medium px-1 tabular-nums">
                {format(startDate, "M.d", { locale: ko })} - {format(addDays(startDate, 6), "M.d", { locale: ko })}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={nextWeek}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      {/* Calendar Grid */}
      <CardContent className="flex-1 p-0 overflow-hidden flex flex-col">
        <div className="grid grid-cols-7 border-b bg-muted/20 px-2 sm:px-4">
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, new Date());
            return (
              <div key={i} className="py-3 text-center border-r last:border-r-0">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {format(day, "E", { locale: ko })}
                </div>
                <div className={cn(
                  "inline-flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold",
                  isToday ? "bg-primary text-primary-foreground" : ""
                )}>
                  {format(day, "d")}
                </div>
              </div>
            );
          })}
        </div>

        {/* Calendar Body Area */}
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-7 min-h-[250px] px-2 sm:px-4">
            {weekDays.map((day, i) => {
              const dayEvents = getEventsForDay(day);
              const isToday = isSameDay(day, new Date());
              return (
                <div key={i} className={cn(
                  "border-r last:border-r-0 h-full p-1.5 flex flex-col gap-1.5",
                  isToday ? "bg-primary/5" : ""
                )}>
                  {isLoading ? (
                    <div className="flex items-center justify-center h-full">
                      <span className="h-[734px] text-xs text-muted-foreground animate-pulse">로딩 중...</span>
                    </div>
                  ) : (
                    <>
                      {dayEvents.slice(0, 7).map(event => (
                        <div 
                          key={event.id} 
                          className="group flex flex-col gap-0.5 rounded-md border border-border/50 bg-background p-1.5 text-xs shadow-sm cursor-pointer hover:border-primary/50 transition-colors"
                          onClick={() => handleEventClick(event)}
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-medium text-muted-foreground truncate">
                              {event.is_all_day ? "하루 종일" : format(parseISO(event.start_time), "HH:mm")}
                            </span>
                            {(event.status === "changed" || event.status === "canceled") && (
                              <span className={`h-1.5 w-1.5 rounded-full ${event.status === "changed" ? "bg-amber-500" : "bg-zinc-400"} shrink-0 ml-1`} title={event.status === "changed" ? "일정 변경됨" : "일정 취소됨"} />
                            )}
                          </div>
                          <span className="font-semibold truncate leading-tight group-hover:text-primary transition-colors">
                            {event.title}
                          </span>
                          <span className="text-[10px] text-muted-foreground truncate">{event.streamer}</span>
                        </div>
                      ))}
                      {dayEvents.length > 7 && (
                        <Button variant="ghost" size="sm" asChild className="h-6 mt-1 text-[10px] text-muted-foreground">
                          <Link href={`/calendar?view=week&date=${format(day, "yyyy-MM-dd")}`}>
                            + {dayEvents.length - 7}개 더 보기
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>

    <ScheduleDetailDrawer 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        schedule={selectedEvent}
      />
    </>
  );
}
