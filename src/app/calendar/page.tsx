"use client"

/**
 * 캘린더 페이지
 *
 * 스트리머 방송 일정을 월간/일간 뷰로 표시한다.
 * 좌측 사이드바에서 전체/즐겨찾기 필터, 카테고리 필터를 제공한다.
 *
 * URL 파라미터:
 * - scope: 'all' | 'favorites' (필터 범위)
 * - view: 'month' | 'day' (뷰 모드)
 * - date: 'yyyy-MM-dd' (현재 날짜)
 * - q: 검색어
 *
 * 성능 최적화:
 * - auth는 AuthProvider의 useAuth()로 통합 (중복 호출 제거)
 * - schedules 조회 범위: 캘린더 그리드 표시에 필요한 최소 범위(~5주)
 * - select 경량화: 캘린더 셀 렌더에 필요한 최소 필드만 조회
 * - favorites 비차단: 일정 먼저 렌더, favorites 병렬 처리
 */
import * as React from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight, Loader2, List, Grid } from "lucide-react"
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer"
import { PageContainer } from "@/components/layout/page-container"
import { CATEGORY_LIST } from "@/config/categories"
import { getHomeSchedules, getMyFavoriteStreamerNames } from "@/app/actions/schedules"
import type { HomeSchedule, Schedule } from "@/app/actions/schedules"
import { isSameDay, parseISO, format, addMonths, subMonths, addDays, subDays, startOfMonth, endOfMonth, startOfWeek, endOfWeek, startOfDay, endOfDay } from "date-fns"
import { ko } from "date-fns/locale"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog"
import { useAuth } from "@/components/providers/auth-provider"
import { VerifiedBadge } from "@/components/ui/verified-badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

function CalendarContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const { user } = useAuth()

  const scope = searchParams.get('scope') || 'all'
  const rawView = searchParams.get('view')
  
  // 기본값 설정 로직 (모바일은 day, 데스크톱은 month)
  const isMobile = typeof window !== 'undefined' ? window.innerWidth < 1024 : false
  const defaultView = isMobile ? 'day' : 'month'
  const view = rawView === 'week' ? 'day' : (rawView || defaultView)
  const q = searchParams.get('q') || ''
  
  React.useEffect(() => {
    if (rawView === 'week') {
      const params = new URLSearchParams(searchParams.toString())
      params.set('view', 'day')
      router.replace(`${pathname}?${params.toString()}`, { scroll: false })
    }
  }, [rawView, pathname, router, searchParams])

  const dateParam = searchParams.get('date')
  const [currentDate, setCurrentDate] = React.useState(() => {
    if (dateParam) {
      const parsed = parseISO(dateParam);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return new Date();
  }) 
  const [selectedCats, setSelectedCats] = React.useState<string[]>(CATEGORY_LIST.map(c => c.id))

  const [isDetailOpen, setIsDetailOpen] = React.useState(false)
  const [selectedEvent, setSelectedEvent] = React.useState<Schedule | null>(null)
  const [events, setEvents] = React.useState<HomeSchedule[]>([])
  const [favoriteStreamerNames, setFavoriteStreamerNames] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(true)

  const handleEventClick = (event: HomeSchedule) => {
    setSelectedEvent(event as unknown as Schedule)
    setIsDetailOpen(true)
  }

  /**
   * 캘린더 그리드에 표시되는 정확한 날짜 범위를 계산.
   * 월 뷰: 해당 월의 첫 주 일요일 ~ 마지막 주 토요일 (약 5주)
   * 일 뷰: 현재 날짜 ± 1일
   */
  const getDateRange = React.useCallback((date: Date, currentView: string) => {
    if (currentView === 'month') {
      const monthStart = startOfMonth(date)
      const monthEnd = endOfMonth(date)
      // 캘린더 그리드는 항상 일요일부터 시작
      const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 })
      // 35칸(5주)이므로 gridStart + 34일
      const gridEnd = addDays(gridStart, 34)
      return { start: gridStart, end: gridEnd }
    }
    // 일 뷰: 해당 날짜의 시작~끝
    return { start: startOfDay(date), end: endOfDay(date) }
  }, [])

  const loadSchedules = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const { start, end } = getDateRange(currentDate, view)
      const { data } = await getHomeSchedules(start, end)
      if (data) setEvents(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [currentDate, view, getDateRange])

  const loadFavorites = React.useCallback(async () => {
    try {
      const names = await getMyFavoriteStreamerNames()
      setFavoriteStreamerNames(names)
    } catch (e) {
      console.error(e)
    }
  }, [])

  React.useEffect(() => {
    // 일정과 즐겨찾기를 병렬로 로드 — favorites가 schedules 렌더를 차단하지 않음
    loadSchedules()
    loadFavorites()
    
    window.addEventListener("schedulesUpdated", loadSchedules)
    window.addEventListener("favoritesUpdated", loadFavorites)
    return () => {
      window.removeEventListener("schedulesUpdated", loadSchedules)
      window.removeEventListener("favoritesUpdated", loadFavorites)
    }
  }, [loadSchedules, loadFavorites])

  const getDayEvents = (targetDate: Date) => {
    return events.filter(e => {
      if (!isSameDay(parseISO(e.start_time), targetDate)) return false;
      if (!e.categories || !e.categories.some(cat => selectedCats.includes(cat))) return false;
      
      // 검색어 필터링
      if (q && !e.title.toLowerCase().includes(q.toLowerCase()) && !e.streamer.toLowerCase().includes(q.toLowerCase())) return false;

      // 실제 즐겨찾기 기반 필터링
      if (scope === 'favorites' && !favoriteStreamerNames.includes(e.streamer)) return false; 
      return true;
    });
  }

  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`, { scroll: false })
  }

  const handleFavoritesScope = () => {
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    updateUrlParam('scope', 'favorites');
  };

  const goPrev = () => {
    if (view === 'month') setCurrentDate(prev => subMonths(prev, 1))
    else setCurrentDate(prev => subDays(prev, 1))
  }

  const goNext = () => {
    if (view === 'month') setCurrentDate(prev => addMonths(prev, 1))
    else setCurrentDate(prev => addDays(prev, 1))
  }

  const goToday = () => setCurrentDate(new Date())

  return (
    <PageContainer className="min-h-[calc(100vh-4rem)] bg-background lg:py-4 flex flex-col lg:flex-row gap-4 lg:gap-5 items-start pb-20 lg:pb-6">
      {/* Left Sidebar Filter */}
      <Card className="w-full lg:w-64 flex-col flex shrink-0 border-border/50 shadow-sm h-fit rounded-none border-x-0 lg:border-x lg:rounded-[12px]">
        <div className="p-3 md:p-3.5 flex flex-col gap-4">
          {/* 보기 필터 */}
          <div>
            <div className="flex bg-muted/60 p-1 rounded-lg">
              <Button variant="ghost" size="sm" className={`flex-1 text-[11px] sm:text-xs h-7 sm:h-8 ${scope === 'all' ? 'bg-foreground shadow-sm text-background font-bold hover:bg-foreground/90 hover:text-background' : 'text-muted-foreground hover:text-foreground/80'}`} onClick={() => updateUrlParam('scope', 'all')}>전체</Button>
              <Button variant="ghost" size="sm" className={`flex-1 text-[11px] sm:text-xs h-7 sm:h-8 ${scope === 'favorites' ? 'bg-foreground shadow-sm text-background font-bold hover:bg-foreground/90 hover:text-background' : 'text-muted-foreground hover:text-foreground/80'}`} onClick={handleFavoritesScope}>즐겨찾기</Button>
            </div>
          </div>
          
          {/* 카테고리 필터 */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h3 className="text-[13px] font-semibold tracking-tight text-foreground/90">카테고리</h3>
              <div className="flex items-center gap-2 md:gap-1.5">
                <Button variant="ghost" size="sm" className="h-9 md:h-6 bg-muted/50 px-4 md:px-2 rounded-md hover:bg-muted font-medium text-[13px] md:text-[11px] text-foreground/80" onClick={() => setSelectedCats(CATEGORY_LIST.map(c => c.id))}>전체 선택</Button>
                <Button variant="ghost" size="sm" className="h-9 md:h-6 bg-muted/50 px-4 md:px-2 rounded-md hover:bg-muted font-medium text-[13px] md:text-[11px] text-foreground/80" onClick={() => setSelectedCats([])}>해제</Button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              {CATEGORY_LIST.map((cat) => {
                const isSelected = selectedCats.includes(cat.id);
                return (
                  <div 
                    key={cat.id} 
                    className={cn(
                      "flex items-center gap-1.5 px-3 h-[28px] rounded-full border text-xs font-semibold cursor-pointer transition-colors leading-none shrink-0",
                      isSelected ? "border-primary bg-primary/10 text-primary" : "border-border/60 bg-background text-muted-foreground hover:bg-muted/50"
                    )}
                    onClick={() => {
                        if (isSelected) setSelectedCats(prev => prev.filter(c => c !== cat.id))
                        else setSelectedCats(prev => [...prev, cat.id])
                    }}
                  >
                    <span className={cn("w-1.5 h-1.5 rounded-full", cat.color)} />
                    {cat.label}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Calendar Area */}
      <Card className="flex-1 w-full lg:w-auto border-border/50 lg:shadow-sm flex flex-col min-w-0 bg-card overflow-hidden rounded-none border-x-0 lg:border-x lg:rounded-xl">
        {/* Calendar Toolbar */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b px-3 py-2.5 md:px-4 md:py-3 gap-2 bg-muted/5 shrink-0">
          <div className="flex items-center gap-3 md:gap-4 w-full sm:w-auto">
            <h2 className="text-[26px] md:text-[30px] font-bold tracking-tight shrink-0 whitespace-nowrap">
              {view === 'month' ? format(currentDate, "yyyy년 M월") : format(currentDate, "M월 d일")}
            </h2>
            <div className="flex items-center bg-muted/50 rounded-full p-0.5 ml-auto sm:ml-0">
              <Button variant="ghost" size="icon" className="h-6.5 w-6.5 md:h-7 md:w-7 rounded-full" onClick={goPrev}><ChevronLeft className="h-4 w-4 md:h-5 md:w-5" /></Button>
              <Button variant="ghost" size="sm" className="h-6.5 md:h-7 ... px-2.5 md:px-3 text-[11px] md:text-xs" onClick={goToday}>오늘</Button>
              <Button variant="ghost" size="icon" className="h-6.5 w-6.5 md:h-7 md:w-7 rounded-full" onClick={goNext}><ChevronRight className="h-4 w-4 md:h-5 md:w-5" /></Button>
            </div>
          </div>
          <div className="flex items-center bg-muted/60 p-0.5 rounded-full w-full sm:w-auto">
            <Button variant="ghost" size="sm" className={`flex-1 sm:flex-none h-6.5 rounded-full px-3 text-[11px] ${view === 'month' ? 'bg-foreground shadow-sm text-background font-bold hover:bg-foreground/90 hover:text-background' : 'text-muted-foreground hover:text-foreground/80'}`} onClick={() => updateUrlParam('view', 'month')}>
              <Grid className="w-3 h-3 mr-1.5" />
              월간
            </Button>
            <Button variant="ghost" size="sm" className={`flex-1 sm:flex-none h-6.5 rounded-full px-3 text-[11px] ${view === 'day' ? 'bg-foreground shadow-sm text-background font-bold hover:bg-foreground/90 hover:text-background' : 'text-muted-foreground hover:text-foreground/80'}`} onClick={() => updateUrlParam('view', 'day')}>
              <List className="w-3 h-3 mr-1.5" />
              일간
            </Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <CardContent className="flex-1 p-0 flex flex-col relative h-[500px] lg:h-auto min-h-[500px]">
          {isLoading && (
            <div className="absolute inset-0 bg-background/50 backdrop-blur-sm z-50 flex flex-col items-center justify-center gap-3">
              <div className="flex items-center justify-center bg-card p-4 rounded-full shadow-sm border border-border/50">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
              <p className="text-sm font-medium text-foreground/80">일정을 불러오는 중입니다...</p>
            </div>
          )}
          
          {/* Calendar Header Row */}
          <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b h-8.5 bg-muted/5 z-10 shrink-0 px-2 sm:px-4`}>
            {view === 'day' ? (
              <div className="flex justify-between items-center text-xs font-semibold px-2 border-r last:border-0">
                <span className="text-muted-foreground">{format(currentDate, "MM.dd")} ({format(currentDate, "E", { locale: ko })})</span>
                {isSameDay(currentDate, new Date()) && (
                  <span className="text-primary tracking-tighter bg-primary/10 px-2 py-0.5 rounded-full">TODAY</span>
                )}
              </div>
            ) : (
              ['일', '월', '화', '수', '목', '금', '토'].map((day, idx) => (
                <div key={day} className={`flex items-center justify-center text-[11px] md:text-xs font-semibold border-r last:border-0 ${idx === 0 ? 'text-red-500' : idx === 6 ? 'text-blue-500' : 'text-muted-foreground'}`}>
                  {day}
                </div>
              ))
            )}
          </div>
          
          {/* Calendar Cells */}
          <div className={cn(
            "px-2 sm:px-4 flex-1",
            view === 'month' ? "grid grid-cols-7 grid-rows-5" : "flex flex-col overflow-y-auto"
          )}>
             {view === 'month' ? (
               Array.from({ length: 35 }).map((_, i) => {
                 const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                 const startPadding = firstDayOfMonth.getDay()
                 const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - startPadding + 1)
                 
                 const isToday = isSameDay(date, new Date());
                 const isCurrentMonth = date.getMonth() === currentDate.getMonth();

                 return (
                   <div key={i} className={`border-r border-b flex flex-col overflow-hidden transition-colors ${!isCurrentMonth ? 'bg-muted/10 opacity-70' : 'bg-background hover:bg-muted/5'} ${isToday ? 'bg-primary/5 hover:bg-primary/10' : ''}`}>
                      <div className="flex justify-between items-center px-1 py-0.5 md:px-1.5 md:py-1 shrink-0 border-b border-border/30">
                        <div className={`text-[11px] md:text-xs inline-flex h-4 w-4 md:h-5 md:w-5 items-center justify-center rounded-sm ${isToday ? 'bg-primary text-primary-foreground font-bold shadow-sm' : 'text-foreground/70 font-medium'} ${date.getDay()===0 && !isToday ? 'text-red-500' : ''} ${date.getDay()===6 && !isToday ? 'text-blue-500' : ''}`}>
                          {date.getDate()}
                        </div>
                      </div>
                      
                      {/* Desktop Schedule Items */}
                      <div className="flex-1 flex flex-col gap-[2px] mt-0.5 p-0.5">
                        {(() => {
                          const dayEvents = getDayEvents(date);
                          const maxVisible = 8;
                          const displayEvents = dayEvents.slice(0, maxVisible);
                          const overflowCount = Math.max(0, dayEvents.length - maxVisible);
                          
                          return (
                            <>
                              <div className="hidden sm:flex flex-col gap-[2px]">
                                {displayEvents.map(event => {
                                  const firstCat = event.categories?.[0];
                                  const styleCat = CATEGORY_LIST.find(c => c.id === firstCat) || CATEGORY_LIST[0];
                                  return (
                                    <div 
                                      key={event.id}
                                      className="group flex items-center gap-1.5 hover:bg-muted/50 px-1 py-[2px] rounded-[3px] cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleEventClick(event);
                                      }}
                                    >
                                      <span className={cn("w-1.5 h-1.5 flex-shrink-0 rounded-full", styleCat.color)} />
                                      <span className="font-semibold text-[10px] sm:text-[11px] text-foreground/80 leading-tight truncate group-hover:text-primary transition-colors">
                                        {event.streamer}
                                      </span>
                                    </div>
                                  )
                                })}
                                {overflowCount > 0 && (
                                <div className="mt-auto pt-[3px]">
                                  <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className="h-5 text-[10px] text-foreground/80 hover:text-foreground hover:bg-muted/50 hover:underline w-full justify-start px-1 py-0 rounded-[3px] font-semibold"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setCurrentDate(date);
                                        const params = new URLSearchParams(searchParams.toString());
                                        params.set('view', 'day');
                                        params.set('date', format(date, 'yyyy-MM-dd'));
                                        router.push(`${pathname}?${params.toString()}`, { scroll: false });
                                      }}
                                    >
                                      + {overflowCount}개 더 보기
                                    </Button>
                                  </div>
                                )}
                              </div>

                              {/* Mobile Schedule Dots / Text */}
                              {dayEvents.length > 0 && (
                                <div className="flex sm:hidden flex-col items-center justify-center p-1" onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentDate(date);
                                  updateUrlParam('view', 'day');
                                }}>
                                  <span className="text-[9px] font-bold bg-muted/80 text-muted-foreground px-1.5 py-0.5 rounded-md mt-0.5">총 {dayEvents.length}개</span>
                                </div>
                              )}
                            </>
                          )
                        })()}
                      </div>
                   </div>
                 )
               })
             ) : (
               /* Day View Content */
               <div className="flex-1 flex flex-col gap-2 py-2 pb-6 sm:pb-3">
                 {(() => {
                   const dayEvents = getDayEvents(currentDate);
                   if (dayEvents.length === 0) {
                     return (
                       <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-muted-foreground h-[300px]">
                         <span className="text-sm font-medium mb-1">등록된 일정이 없습니다</span>
                         <span className="text-xs text-muted-foreground/70 mb-4">새로운 일정을 추가하거나 다른 날짜를 선택해보세요.</span>
                       </div>
                     );
                   }

                   return dayEvents.map(event => {
                     const firstCat = event.categories?.[0];
                     const styleCat = CATEGORY_LIST.find(c => c.id === firstCat) || CATEGORY_LIST[0];
                     
                     return (
                       <div 
                         key={event.id}
                         className="group flex flex-col gap-1 p-3 rounded-lg border border-border/60 bg-card hover:border-primary/50 hover:shadow-sm transition-all cursor-pointer relative shrink-0"
                         onClick={() => handleEventClick(event)}
                       >
                         <div className={`absolute left-0 top-3 bottom-3 w-[3px] rounded-r-full ${styleCat.color}`} />
                         
                         <div className="flex items-start gap-3 pl-2 w-full min-w-0">
                           {/* 시간 영역 고정 */}
                           <div className="flex items-start text-[13px] md:text-sm font-semibold shrink-0 pt-[1px] text-foreground/80 w-[48px] md:w-[56px] whitespace-nowrap">
                               {event.is_all_day ? "종일" : format(parseISO(event.start_time), "HH:mm")}
                            </div>

                            {/* 프로필 이미지 */}
                            <div className="shrink-0 pt-0.5">
                              <Avatar className="h-7 w-7 border">
                                <AvatarImage src={event.streamers?.image_url || undefined} alt={event.streamer} />
                                <AvatarFallback className="text-[10px]">{event.streamer[0]}</AvatarFallback>
                              </Avatar>
                            </div>

                           {/* 세부 정보 영역 */}
                           <div className="flex-1 min-w-0 flex flex-col">
                             <div className="flex items-center justify-between gap-2">
                               <div className="text-[14px] md:text-[15px] font-bold truncate group-hover:text-primary transition-colors leading-snug flex items-center gap-1">
                                 {event.streamer}
                                 {event.streamers?.verified_mark && <VerifiedBadge size={14} />}
                               </div>
                               <div className="flex shrink-0">
                                 {(event.status === "changed" || event.status === "canceled") && (
                                   <span className={cn(
                                     "text-[10px] px-1.5 py-0.5 rounded-sm font-medium shrink-0",
                                     event.status === "changed" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400" : "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400"
                                   )}>
                                     {event.status === "changed" ? "변경" : "취소"}
                                   </span>
                                 )}
                               </div>
                             </div>
                             {/* 설명 텍스트 (ellipsis) */}
                             <div className="text-[12px] md:text-[13px] text-muted-foreground truncate w-full mt-[1px]">
                               {event.title}
                             </div>
                           </div>
                         </div>
                       </div>
                     )
                   })
                 })()}
               </div>
             )}
          </div>
        </CardContent>
      </Card>
      
      <ScheduleDetailDrawer 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        schedule={selectedEvent}
      />

      <div className="lg:hidden">
        <CreateScheduleDialog isMobileTrigger />
      </div>
    </PageContainer>
  )
}

export default function CalendarPage() {
  return (
    <React.Suspense fallback={null}>
      <CalendarContent />
    </React.Suspense>
  )
}
