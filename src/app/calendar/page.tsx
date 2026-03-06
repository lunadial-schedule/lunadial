"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { ScheduleDetailDrawer } from "@/components/schedule-detail-drawer"
import { PageContainer } from "@/components/layout/page-container"
import { CATEGORY_LIST, getCategoryByLabel } from "@/config/categories"
import { getSchedules, type Schedule } from "@/app/actions/schedules"
import { isSameDay, parseISO, format, addMonths, subMonths, addWeeks, subWeeks, addDays, subDays } from "date-fns"
import { useRouter, useSearchParams, usePathname } from "next/navigation"

export default function CalendarPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()

  const scope = searchParams.get('scope') || 'all'
  const view = searchParams.get('view') || 'month'
  const q = searchParams.get('q') || ''
  
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
  const [events, setEvents] = React.useState<Schedule[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  const handleEventClick = (event: Schedule) => {
    setSelectedEvent(event)
    setIsDetailOpen(true)
  }

  const loadSchedules = React.useCallback(async () => {
    setIsLoading(true);
    // 넓은 범위로 로딩
    const start = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 2, 1);
    const { data } = await getSchedules(start, end);
    if (data) setEvents(data);
    setIsLoading(false);
  }, [currentDate.getFullYear(), currentDate.getMonth()]);

  React.useEffect(() => {
    loadSchedules();
    window.addEventListener("schedulesUpdated", loadSchedules);
    return () => window.removeEventListener("schedulesUpdated", loadSchedules);
  }, [loadSchedules]);

  const getDayEvents = (targetDate: Date) => {
    return events.filter(e => {
      if (!isSameDay(parseISO(e.start_time), targetDate)) return false;
      if (!e.categories || !e.categories.some(cat => selectedCats.includes(cat))) return false;
      
      // 검색어 필터링
      if (q && !e.title.toLowerCase().includes(q.toLowerCase()) && !e.streamer.toLowerCase().includes(q.toLowerCase())) return false;

      // MVP: 즐겨찾기는 임의의 하드코딩된 스트리머 조건(예: 치지직 1, 치지직 2)으로 목업 필터링
      if (scope === 'favorites' && !e.streamer.includes("치지직")) return false; 
      return true;
    });
  }

  const updateUrlParam = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set(key, value)
    router.push(`${pathname}?${params.toString()}`)
  }

  const goPrev = () => {
    if (view === 'month') setCurrentDate(prev => subMonths(prev, 1))
    else if (view === 'week') setCurrentDate(prev => subWeeks(prev, 1))
    else setCurrentDate(prev => subDays(prev, 1))
  }

  const goNext = () => {
    if (view === 'month') setCurrentDate(prev => addMonths(prev, 1))
    else if (view === 'week') setCurrentDate(prev => addWeeks(prev, 1))
    else setCurrentDate(prev => addDays(prev, 1))
  }

  const goToday = () => setCurrentDate(new Date())

  return (
    <PageContainer className="min-h-[calc(100vh-4rem)] bg-background py-6 md:py-8 flex flex-col md:flex-row gap-6 items-start">
      {/* Left Sidebar Filter (3-col equivalent) */}
      <Card className="w-full md:w-64 flex-col gap-6 flex shrink-0 p-5 border-border/50 shadow-sm h-fit">
        <div className="space-y-4">
          <div>
            <h2 className="mb-3 text-sm font-semibold tracking-tight text-foreground/80">보기 필터</h2>
            <div className="flex bg-muted/50 p-1 rounded-lg">
              <Button variant="ghost" size="sm" className={`flex-1 text-xs h-8 ${scope === 'all' ? 'bg-background shadow-sm text-foreground hover:bg-background/80' : 'text-muted-foreground'}`} onClick={() => updateUrlParam('scope', 'all')}>전체</Button>
              <Button variant="ghost" size="sm" className={`flex-1 text-xs h-8 ${scope === 'favorites' ? 'bg-background shadow-sm text-foreground hover:bg-background/80' : 'text-muted-foreground'}`} onClick={() => updateUrlParam('scope', 'favorites')}>즐겨찾기</Button>
            </div>
          </div>
          <div className="pt-2">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground/80">카테고리</h2>
              <div className="flex items-center">
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={() => setSelectedCats(CATEGORY_LIST.map(c => c.id))}>전체 추가</Button>
                <Button variant="ghost" size="sm" className="h-6 text-xs px-2 text-muted-foreground" onClick={() => setSelectedCats([])}>전체 해제</Button>
              </div>
            </div>
            <div className="space-y-3">
              {CATEGORY_LIST.map((cat) => (
                <div key={cat.id} className="flex items-center space-x-2">
                  <Checkbox 
                    id={`cat-${cat.id}`} 
                    checked={selectedCats.includes(cat.id)}
                    onCheckedChange={(checked) => {
                      if (checked) setSelectedCats(prev => [...prev, cat.id])
                      else setSelectedCats(prev => prev.filter(c => c !== cat.id))
                    }}
                  />
                  <label htmlFor={`cat-${cat.id}`} className="flex items-center gap-2 text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                    {cat.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* Main Calendar Area (9-col equivalent) */}
      <Card className="flex-1 border-border/50 shadow-sm flex flex-col min-w-0 bg-card overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between border-b p-4 gap-4 bg-muted/10 shrink-0">
          <div className="flex items-center gap-4">
            <h2 className="text-2xl font-bold tracking-tight">{format(currentDate, "yyyy년 M월")}</h2>
            <div className="flex items-center bg-muted/50 rounded-full p-0.5">
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
              <Button variant="ghost" size="sm" className="h-8 rounded-full font-medium px-4" onClick={goToday}>오늘</Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
            </div>
          </div>
          <div className="flex items-center bg-muted/50 p-1 rounded-full">
            <Button variant="ghost" size="sm" className={`h-7 rounded-full px-4 ${view === 'month' ? 'bg-background shadow-sm text-foreground hover:bg-background/80' : 'text-muted-foreground'}`} onClick={() => updateUrlParam('view', 'month')}>월간</Button>
            <Button variant="ghost" size="sm" className={`h-7 rounded-full px-4 ${view === 'week' ? 'bg-background shadow-sm text-foreground hover:bg-background/80' : 'text-muted-foreground'}`} onClick={() => updateUrlParam('view', 'week')}>주간</Button>
            <Button variant="ghost" size="sm" className={`h-7 rounded-full px-4 ${view === 'day' ? 'bg-background shadow-sm text-foreground hover:bg-background/80' : 'text-muted-foreground'}`} onClick={() => updateUrlParam('view', 'day')}>일간</Button>
          </div>
        </div>

        {/* Calendar Grid Mockup */}
        <CardContent className="flex-1 p-0 overflow-auto flex flex-col">
          <div className={`grid ${view === 'day' ? 'grid-cols-1' : 'grid-cols-7'} border-b h-10 sticky top-0 bg-muted/20 z-10 shrink-0 px-2 sm:px-4`}>
            {view === 'day' ? (
              <div className="flex items-center justify-center text-xs font-semibold text-muted-foreground border-r last:border-0">
                {format(currentDate, "MM.dd")} ({['일', '월', '화', '수', '목', '금', '토'][currentDate.getDay()]})
              </div>
            ) : (
              ['일', '월', '화', '수', '목', '금', '토'].map((day) => (
                <div key={day} className="flex items-center justify-center text-xs font-semibold text-muted-foreground border-r last:border-0">
                  {day}
                </div>
              ))
            )}
          </div>
          
          <div className={`grid ${view === 'day' ? 'grid-cols-1 grid-rows-1' : view === 'week' ? 'grid-cols-7 grid-rows-1' : 'grid-cols-7 grid-rows-5'} h-[calc(100%-40px)] min-h-[600px] px-2 sm:px-4`}>
             {Array.from({ length: view === 'month' ? 35 : view === 'week' ? 7 : 1 }).map((_, i) => {
               let date = currentDate;
               if (view === 'month') {
                 const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
                 const startPadding = firstDayOfMonth.getDay()
                 date = new Date(currentDate.getFullYear(), currentDate.getMonth(), i - startPadding + 1)
               } else if (view === 'week') {
                 // 이번 주의 일요일 기준
                 const startOfWeek = new Date(currentDate)
                 startOfWeek.setDate(currentDate.getDate() - currentDate.getDay())
                 date = new Date(startOfWeek.getFullYear(), startOfWeek.getMonth(), startOfWeek.getDate() + i)
               }
               
               const isToday = isSameDay(date, new Date());
               const isCurrentMonth = date.getMonth() === currentDate.getMonth();

               return (
                 <div key={i} className={`border-r border-b p-1.5 sm:p-2 min-h-[120px] transition-colors ${view === 'month' && !isCurrentMonth ? 'bg-muted/30' : ''} ${isToday ? 'bg-primary/5' : ''} hover:bg-muted/10`}>
                    <div className="flex justify-between items-center mb-1">
                      <div className={`text-sm inline-flex h-6 w-6 items-center justify-center rounded-full ${isToday ? 'bg-primary text-primary-foreground font-bold' : 'text-muted-foreground font-medium'}`}>
                        {date.getDate()}
                      </div>
                    </div>
                    
                    {/* Actual Schedule Items with Pill UI */}
                    <div className="flex flex-col gap-1 mt-1">
                      {(() => {
                        const dayEvents = getDayEvents(date);
                        const displayEvents = view === 'month' ? dayEvents.slice(0, 12) : dayEvents;
                        const overflowCount = view === 'month' ? Math.max(0, dayEvents.length - 12) : 0;
                        
                        return (
                          <>
                            {displayEvents.map(event => {
                              const firstCat = event.categories?.[0];
                              const styleCat = CATEGORY_LIST.find(c => c.id === firstCat) || CATEGORY_LIST[0];
                              return (
                                <div 
                                  key={event.id}
                                  className="group flex flex-col gap-0.5 rounded border border-border/50 bg-background p-1 px-1.5 text-xs shadow-sm cursor-pointer hover:border-primary/50 relative overflow-hidden"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEventClick(event);
                                  }}
                                >
                                  <div className="flex items-center justify-between pl-1">
                                    <div className="flex items-center gap-1.5 truncate">
                                      <span className={`w-2 h-2 flex-shrink-0 rounded-full ${styleCat.color}`} title={styleCat.label} />
                                      <span className="font-medium truncate group-hover:text-primary transition-colors">
                                        {view === 'month' || view === 'week' ? (
                                          event.streamer
                                        ) : (
                                          <>
                                            <span className="text-muted-foreground font-normal mr-1">
                                              {event.is_all_day ? "하루 종일" : format(parseISO(event.start_time), "HH:mm")}
                                            </span>
                                            {event.streamer} <span className="text-muted-foreground font-normal text-[10px] sm:text-xs ml-1"> {event.title}</span>
                                          </>
                                        )}
                                      </span>
                                    </div>
                                    {(event.status === "changed" || event.status === "canceled") && (
                                      <span className={`shrink-0 h-1.5 w-1.5 rounded-full ${event.status === "changed" ? "bg-amber-500" : "bg-zinc-400"} ml-1`} title={event.status === "changed" ? "일정 변경됨" : "일정 취소됨"} />
                                    )}
                                  </div>
                                </div>
                              )
                            })}
                            {overflowCount > 0 && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                className="h-6 mt-1 text-[10px] text-muted-foreground w-full justify-start p-1 hover:bg-muted/50"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCurrentDate(date);
                                  updateUrlParam('view', 'week');
                                }}
                              >
                                + {overflowCount}개 더 보기
                              </Button>
                            )}
                          </>
                        )
                      })()}
                    </div>
                 </div>
               )
             })}
          </div>
        </CardContent>
      </Card>
      
      <ScheduleDetailDrawer 
        open={isDetailOpen} 
        onOpenChange={setIsDetailOpen} 
        schedule={selectedEvent}
      />
    </PageContainer>
  )
}
