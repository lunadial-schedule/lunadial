"use client"

/**
 * 오늘의 일정 카드 — 날짜별 일정 목록, 즐겨찾기 필터 지원
 *
 * 서버에서 전달받은 초기 데이터(initialEvents, initialFavoriteNames)를
 * 사용하여 초기 로드 시 추가 fetch 없이 즉시 렌더한다.
 * 날짜 변경 시에만 클라이언트에서 추가 조회한다.
 */;

import * as React from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Plus } from "lucide-react";
import { addDays, format, isSameDay, parseISO } from "date-fns";
import { ko } from "date-fns/locale";

import { getHomeSchedules, getMyFavoriteStreamerNames } from "@/app/actions/schedules";
import type { HomeSchedule } from "@/app/actions/schedules";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer";
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog";
import { CATEGORY_LIST } from "@/config/categories";
import { VerifiedBadge } from "@/components/ui/verified-badge";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/auth-provider";
import type { Schedule } from "@/app/actions/schedules";

interface TodayScheduleCardProps {
  initialEvents?: HomeSchedule[];
  initialFavoriteNames?: string[];
}

export function TodayScheduleCard({
  initialEvents = [],
  initialFavoriteNames = [],
}: TodayScheduleCardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [currentDate, setCurrentDate] = React.useState(new Date());
  const [events, setEvents] = React.useState<HomeSchedule[]>(initialEvents);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isRefreshing, setIsRefreshing] = React.useState(false); // Background revalidation
  const [isDetailOpen, setIsDetailOpen] = React.useState(false);
  const [selectedEvent, setSelectedEvent] = React.useState<Schedule | null>(null);
  const [isFavoritesOnly, setIsFavoritesOnly] = React.useState(false);
  const [favoriteStreamerNames, setFavoriteStreamerNames] = React.useState<string[]>(initialFavoriteNames);

  // 초기 날짜(오늘) 기준인지 추적 — 서버 데이터를 그대로 사용할지 판단
  const initialDateRef = React.useRef(true);

  // 어제, 오늘, 내일 Date 객체 배열
  const targetDays = React.useMemo(() => [
    addDays(currentDate, -1),
    currentDate,
    addDays(currentDate, 1)
  ], [currentDate]);

  const goNext = () => { initialDateRef.current = false; setCurrentDate(prev => addDays(prev, 1)); };
  const goPrev = () => { initialDateRef.current = false; setCurrentDate(prev => addDays(prev, -1)); };
  const goToday = () => setCurrentDate(new Date());

  const handleEventClick = (event: HomeSchedule) => {
    // HomeSchedule을 Schedule로 캐스팅 — ScheduleDetailDrawer에서 getScheduleById로 상세 조회함
    setSelectedEvent(event as unknown as Schedule);
    setIsDetailOpen(true);
  };

  const lastRequestIdRef = React.useRef(0);

  const loadData = React.useCallback(async (isBackground = false) => {
    // 초기 로드 시에는 서버에서 받은 데이터 사용
    if (!isBackground && initialDateRef.current) {
      initialDateRef.current = false;
      return;
    }
    
    const requestId = ++lastRequestIdRef.current;
    if (isBackground) setIsRefreshing(true);
    else setIsLoading(true);
    
    const startDate = addDays(currentDate, -2);
    const endDate = addDays(currentDate, 2);
    
    try {
      // 일정과 즐겨찾기를 병렬로 가져온다
      const [schedulesRes, favNames] = await Promise.all([
        getHomeSchedules(startDate, endDate),
        getMyFavoriteStreamerNames()
      ]);
      
      if (requestId !== lastRequestIdRef.current) return;
      
      if (schedulesRes.data) {
        setEvents(schedulesRes.data);
      }
      setFavoriteStreamerNames(favNames);
    } catch (e) {
      console.error("[TodayScheduleCard] Load Error:", e);
    } finally {
      if (requestId === lastRequestIdRef.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [currentDate]);

  React.useEffect(() => {
    loadData(false);
  }, [loadData]);

  React.useEffect(() => {
    const handleUpdate = (e: Event) => {
      const customEvent = e as CustomEvent;
      const detail = customEvent.detail;

      if (detail && detail.action) {
        setEvents(prev => {
          let newEvents = [...prev];
          if (detail.action === 'update' && detail.schedule) {
            const idx = newEvents.findIndex(ev => ev.id === detail.schedule.id);
            if (idx >= 0) {
              const u = detail.schedule;
              newEvents[idx] = {
                ...newEvents[idx],
                title: u.title,
                streamer: u.streamer,
                streamer_id: u.streamer_id,
                categories: u.categories,
                link: u.link,
                status: u.status,
                is_all_day: u.is_all_day,
                start_time: u.start_time,
                streamers: u.streamers || newEvents[idx].streamers
              } as HomeSchedule;
            }
          } else if (detail.action === 'delete' && detail.scheduleId) {
            newEvents = newEvents.filter(ev => ev.id !== detail.scheduleId);
          }
          return newEvents;
        });
        loadData(true);
      } else {
        loadData(true);
      }
    };

    window.addEventListener("schedulesUpdated", handleUpdate);
    return () => window.removeEventListener("schedulesUpdated", handleUpdate);
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

  const handleFavoritesFilterChange = (checked: boolean) => {
    if (checked && !user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    setIsFavoritesOnly(checked);
  };

  return (
    <>
      <Card className="flex flex-col border-border/50 shadow-sm bg-card overflow-hidden h-[700px] lg:h-[1420px]">
        {/* Header & Controls */}
        <CardHeader className="h-9 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0">
          <CardTitle className="text-[18px] font-bold flex items-center gap-1.5 m-0 p-0 relative">
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
        <div className="flex-1 overflow-x-auto overflow-y-hidden snap-x snap-mandatory scrollbar-hide bg-muted/10 p-2.5 md:p-3">
          <div className="flex lg:grid lg:grid-cols-3 gap-3 md:gap-4 h-full w-full">
            {targetDays.map((day, colIndex) => {
              const dayEvents = getEventsForDay(day);
              const isTodayDate = isSameDay(day, new Date());
              const label = getDayLabel(day);

              return (
                <div 
                  key={colIndex} 
                  className={cn(
                    "relative flex-shrink-0 w-full lg:w-auto snap-center flex flex-col bg-background border border-border/50 rounded-xl shadow-sm p-2.5 md:p-3 transition-all h-full overflow-hidden",
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
                  
                  <div className="flex-1 flex flex-col gap-1.5 overflow-y-auto pr-1 relative min-h-0 pt-1.5 pb-4 z-10">
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
                                  "flex-1 text-sm font-semibold truncate group-hover:text-primary transition-colors leading-snug flex items-center gap-1",
                                  isUpNext && "text-foreground"
                                )}>
                                  {event.streamer}
                                  {event.streamers?.verified_mark && <VerifiedBadge size={14} />}
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
                  <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-muted/30 via-muted/10 to-transparent pointer-events-none z-0" />
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
