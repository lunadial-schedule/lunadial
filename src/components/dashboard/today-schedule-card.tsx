"use client"

/**
 * 오늘의 일정 카드 — 날짜별 일정 목록, 즐겨찾기 필터 지원
 */;

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { getSchedules, type Schedule } from "@/app/actions/schedules";
import { getMyFavorites } from "@/app/actions/favorites";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer";
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog";
import { CATEGORY_LIST } from "@/config/categories";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function TodayScheduleCard() {
  const router = useRouter();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<Schedule[]>([]);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<Schedule | null>(null);
  const [isFavoritesOnly, setIsFavoritesOnly] = React.useState(false);
  const [favoriteStreamerNames, setFavoriteStreamerNames] = React.useState<string[]>([]);

  // 어제, 오늘, 내일 Date 객체 배열
  const targetDays = React.useMemo(() => [
    addDays(currentDate, -1),
    currentDate,
    addDays(currentDate, 1)
  ], [currentDate]);

  const goNext = () => setCurrentDate(prev => addDays(prev, 1));
  const goPrev = () => setCurrentDate(prev => addDays(prev, -1));
  const goToday = () => setCurrentDate(new Date());

  const handleEventClick = (event: Schedule) => {
    setSelectedEvent(event);
    setIsDetailOpen(true);
  };

  const loadData = React.useCallback(async () => {
    setIsLoading(true);
    // 3일치 여유 있게 앞뒤로 좀 더 가져온다 (안전하게 -2일 ~ +2일)
    const startDate = addDays(currentDate, -2);
    const endDate = addDays(currentDate, 2);
    
    // 일정과 즐겨찾기를 동시에 가져온다
    const [schedulesRes, favoritesRes] = await Promise.all([
      getSchedules(startDate, endDate),
      getMyFavorites()
    ]);
    
    if (schedulesRes.data) {
      setEvents(schedulesRes.data);
    }
    if (favoritesRes.data) {
      const fNames = favoritesRes.data.map(f => (f.streamers as any)?.name).filter(Boolean) as string[];
      setFavoriteStreamerNames(fNames);
    }
    
    setIsLoading(false);
  }, [currentDate]);

  React.useEffect(() => {
    loadData();
    window.addEventListener("schedulesUpdated", loadData);
    return () => window.removeEventListener("schedulesUpdated", loadData);
  }, [loadData]);

  const getEventsForDay = (day: Date) => {
    return events.filter(e => {
      if (!isSameDay(parseISO(e.start_time), day)) return false;
      if (isFavoritesOnly && (!e.streamer || !favoriteStreamerNames.includes(e.streamer))) return false;
      return true;
    });
  };
  
  const getDayLabel = (day: Date) => {
    const today = new Date();
    if (isSameDay(day, today)) return "오늘";
    if (isSameDay(day, addDays(today, -1))) return "어제";
    if (isSameDay(day, addDays(today, 1))) return "내일";
    return format(day, "EEEE", { locale: ko });
  };

  const handleFavoritesFilterChange = async (checked: boolean) => {
    if (checked) {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
          router.push("/login");
        }
        return; // do not check
      }
    }
    setIsFavoritesOnly(checked);
  };

  return (
    <>
      <Card className="flex flex-col border-border/50 shadow-sm bg-card overflow-hidden h-[700px] lg:h-[1610px]">
        {/* Header & Controls */}
        <CardHeader className="min-h-[42px] px-4 py-2.5 flex flex-row items-center justify-between border-b shrink-0">
          <CardTitle className="text-[18px] font-bold flex items-center gap-1.5 m-0 p-0">
            <CalendarIcon className="h-4 w-4 text-primary" />
            오늘의 일정
          </CardTitle>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center mr-1">
              <Checkbox 
                id="favorites-only-today" 
                checked={isFavoritesOnly}
                onCheckedChange={handleFavoritesFilterChange}
                className="hidden peer"
              />
              <Label htmlFor="favorites-only-today" className="flex items-center justify-center cursor-pointer select-none">
                <div className={cn(
                  "flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium transition-colors",
                  isFavoritesOnly ? "text-amber-500 bg-amber-500/10" : "text-muted-foreground hover:bg-muted"
                )}>
                  <span className="text-[15px]">★</span>
                  <span className="hidden sm:inline">즐겨찾기</span>
                </div>
              </Label>
            </div>
            <div className="flex items-center gap-1.5 border-l border-border/60 pl-2 ml-1">
              <Button variant="ghost" size="sm" onClick={goToday} className="h-7 px-2 text-xs font-semibold text-foreground/70 hover:text-foreground rounded-md tracking-tight">오늘</Button>
              <div className="flex items-center bg-muted/40 rounded-md p-0.5">
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-foreground/80 hover:text-foreground" onClick={goPrev}>
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-6 w-6 rounded-sm text-foreground/80 hover:text-foreground" onClick={goNext}>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardHeader>

        {/* Scrollable Columns Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide bg-muted/10 p-3 md:p-4">
          <div className="flex lg:grid lg:grid-cols-3 gap-3 md:gap-4 h-full w-full">
            {targetDays.map((day, colIndex) => {
              const dayEvents = getEventsForDay(day);
              const isTodayDate = isSameDay(day, new Date());
              const label = getDayLabel(day);

              return (
                <div 
                  key={colIndex} 
                  className={cn(
                    "relative flex-shrink-0 w-full lg:w-auto snap-center flex flex-col bg-background border border-border/50 rounded-2xl shadow-sm p-3 md:p-4 transition-all h-full overflow-hidden",
                    colIndex !== 1 && "hidden lg:flex"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center gap-1.5 mb-2 shrink-0 pb-2 border-b border-border/50">
                    <span className={cn(
                      "text-xs font-semibold px-2 py-0.5 rounded-md",
                      isTodayDate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                    )}>
                      {label}
                    </span>
                    <span className="text-sm font-semibold tracking-tight">
                      {format(day, "M/d(E)", { locale: ko })}
                    </span>
                    <span className="text-sm text-muted-foreground mx-0.5">·</span>
                    <span className="text-sm text-muted-foreground font-medium">
                      총 {dayEvents.length}개
                    </span>
                  </div>
                  
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1 relative min-h-0 py-2 z-10 pb-6">
                    {isLoading ? (
                       <div className="flex-1 flex items-center justify-center min-h-[150px]">
                         <span className="text-xs text-muted-foreground animate-pulse">로딩 중...</span>
                       </div>
                    ) : dayEvents.length === 0 ? (
                      <div className="flex-1 flex flex-col items-center justify-center min-h-[150px] gap-2 text-muted-foreground">
                        <p className="text-sm font-medium">등록된 일정이 없습니다</p>
                        <p className="text-xs mb-1">새 일정을 추가해보세요</p>
                        <div className="mt-1 flex flex-col items-center">
                          <CreateScheduleDialog />
                        </div>
                      </div>
                    ) : (
                      <>
                        {dayEvents.map((event, idx) => {
                          const firstCat = event.categories?.[0];
                          const styleCat = CATEGORY_LIST.find(c => c.id === firstCat) || CATEGORY_LIST[0];
                          
                          const eventTime = parseISO(event.start_time);
                          const diffMinutes = (eventTime.getTime() - new Date().getTime()) / 60000;
                          const isUpNext = diffMinutes > 0 && diffMinutes <= 60 && !event.is_all_day;
                          
                          const isFirstUpNext = isTodayDate && isUpNext && dayEvents.findIndex(e => {
                            const d = (parseISO(e.start_time).getTime() - new Date().getTime()) / 60000;
                            return d > 0 && d <= 60 && !e.is_all_day;
                          }) === idx;
                          
                          return (
                            <div 
                              key={event.id}
                              id={isFirstUpNext ? 'upnext-first' : undefined}
                              className={cn(
                                "group flex flex-col gap-1.5 p-3 rounded-xl border border-border/60 hover:bg-muted/30 hover:border-primary/50 transition-all cursor-pointer relative shrink-0",
                                isUpNext && "bg-amber-500/5 dark:bg-amber-500/10"
                              )}
                              onClick={() => handleEventClick(event)}
                            >
                              <div className={cn(
                                "absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full",
                                styleCat.color
                              )} />
                              
                              <div className="flex items-start justify-between gap-2 pl-2">
                                <div className={cn(
                                  "flex items-center gap-1.5 text-xs font-medium shrink-0 mt-[2px]",
                                  isUpNext ? "text-primary font-bold" : "text-muted-foreground"
                                )}>
                                   {event.is_all_day ? "하루 종일" : format(eventTime, "HH:mm")}
                                </div>
                                <div className={cn(
                                  "flex-1 text-sm font-semibold truncate group-hover:text-primary transition-colors leading-snug",
                                  isUpNext && "text-foreground"
                                )}>
                                  {event.streamer}
                                </div>
                                <div className="flex flex-col sm:flex-row items-end sm:items-center gap-1 shrink-0">
                                  {isUpNext && (
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-sm font-semibold tracking-tight bg-amber-100/50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300">
                                      곧 시작
                                    </span>
                                  )}
                                  {(event.status === "changed" || event.status === "canceled") && (
                                    <span className={cn(
                                      "shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                                      event.status === "changed" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                                    )}>
                                      {event.status === "changed" ? "변경" : "취소"}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground truncate flex items-center">
                                <span className={cn("w-2 h-2 rounded-full shrink-0")} />
                                {event.title}
                              </div>
                            </div>
                          )
                        })}
                      </>
                    )}
                  </div>
                  {/* 하단 빈 공간 그라데이션 (허전함 방지) */}
                  <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-muted/30 via-muted/10 to-transparent pointer-events-none z-0" />
                </div>
              );
            })}
          </div>
        </div>
      </Card>

      <ScheduleDetailDrawer 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        schedule={selectedEvent}
      />
    </>
  );
}
