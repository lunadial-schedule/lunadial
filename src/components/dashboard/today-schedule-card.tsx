"use client";

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
      <Card className="flex flex-col border-border/50 shadow-sm bg-card overflow-hidden h-[500px] lg:h-full">
        {/* Header & Controls */}
        <CardHeader className="h-[52px] md:h-[56px] px-[14px] md:px-4 py-0 flex flex-row items-center justify-between border-b shrink-0">
          <CardTitle className="text-base md:text-lg font-semibold flex items-center gap-2 m-0 p-0">
            <CalendarIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
            오늘의 일정
          </CardTitle>
          <div className="flex items-center gap-1.5 md:gap-2">
            <div className="flex items-center gap-2 mr-2">
              <Checkbox 
                id="favorites-only-today" 
                checked={isFavoritesOnly}
                onCheckedChange={handleFavoritesFilterChange}
              />
              <Label htmlFor="favorites-only-today" className="text-xs md:text-sm font-medium cursor-pointer select-none">
                즐겨찾기
              </Label>
            </div>
            <Button variant="outline" size="sm" onClick={goToday} className="h-7 md:h-8 rounded-full text-xs sm:text-sm px-3">오늘</Button>
            <div className="flex items-center bg-muted/50 rounded-full p-0.5">
              <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 rounded-full" onClick={goPrev}>
                <ChevronLeft className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6 md:h-7 md:w-7 rounded-full" onClick={goNext}>
                <ChevronRight className="h-3 w-3 md:h-4 md:w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        {/* Scrollable Columns Container */}
        <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide bg-muted/10 p-3 md:p-4">
          <div className="flex lg:grid lg:grid-cols-3 gap-3 md:gap-4 h-full w-full">
            {targetDays.map((day, colIndex) => {
              const dayEvents = getEventsForDay(day);
              const isTodayDate = isSameDay(day, new Date());
              const displayEvents = dayEvents.slice(0, 17);
              const overflowCount = Math.max(0, dayEvents.length - 17);
              const label = getDayLabel(day);

              return (
                <div 
                  key={colIndex} 
                  className={cn(
                    "flex-shrink-0 w-full lg:w-auto snap-center flex flex-col bg-background border border-border/50 rounded-2xl shadow-sm p-3 md:p-4 transition-all",
                    colIndex !== 1 && "hidden lg:flex"
                  )}
                >
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <div className="flex items-center gap-2">
                      <span className={cn(
                        "text-xs font-semibold px-2 py-0.5 rounded-full",
                        isTodayDate ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                      )}>
                        {label}
                      </span>
                      <span className="text-sm font-semibold tracking-tight">
                        {format(day, "M/d (E)", { locale: ko })}
                      </span>
                    </div>
                    {dayEvents.length > 0 && (
                      <span className="text-xs text-muted-foreground font-medium">
                        총 {dayEvents.length}개
                      </span>
                    )}
                  </div>

                  {/* Column Body / Event List */}
                  <div className="flex-1 flex flex-col gap-2 overflow-y-auto pr-1">
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
                        {displayEvents.map(event => {
                          const firstCat = event.categories?.[0];
                          const styleCat = CATEGORY_LIST.find(c => c.id === firstCat) || CATEGORY_LIST[0];
                          
                          return (
                            <div 
                              key={event.id}
                              className="group flex flex-col gap-1 p-2.5 rounded-xl border border-border/60 bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer relative"
                              onClick={() => handleEventClick(event)}
                            >
                              <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${styleCat.color}`} />
                              
                              <div className="flex items-start justify-between gap-2 pl-1.5">
                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-medium shrink-0 mt-0.5">
                                   {event.is_all_day ? "하루 종일" : format(parseISO(event.start_time), "HH:mm")}
                                </div>
                                <div className="flex-1 text-sm font-semibold truncate group-hover:text-primary transition-colors leading-snug">
                                  {event.streamer}
                                </div>
                                {(event.status === "changed" || event.status === "canceled") && (
                                  <span className={cn(
                                    "shrink-0 text-[10px] px-1.5 py-0.5 rounded-sm font-medium",
                                    event.status === "changed" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                  )}>
                                    {event.status === "changed" ? "변경" : "취소"}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-muted-foreground pl-1.5 truncate">
                                {event.title}
                              </div>
                            </div>
                          )
                        })}
                        {overflowCount > 0 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full h-8 mt-1 text-xs text-muted-foreground justify-between px-3 hover:bg-muted/50 hover:text-foreground rounded-lg"
                            onClick={() => {
                              router.push(`/calendar?view=day&date=${format(day, "yyyy-MM-dd")}`)
                            }}
                          >
                            <span>+ {overflowCount}개 더보기</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        )}
                      </>
                    )}
                  </div>
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
