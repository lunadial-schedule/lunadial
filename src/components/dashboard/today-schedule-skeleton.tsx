import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * 오늘의 일정 스켈레톤
 * 초기 데이터를 기다릴 때 TodayScheduleCard와 최대한 동일한 UI 프레임(껍데기)을 
 * 먼저 렌더링하고 내부의 카드들만 로딩 상태(안개효과)로 표시하여 빈 화면 시간을 없앤다.
 */
export function TodayScheduleSkeleton() {
  return (
    <Card className="flex flex-col border-border/50 bg-card overflow-hidden h-[700px] lg:h-[1420px]">
      <CardHeader className="h-9 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0">
        <CardTitle className="text-[18px] font-bold flex items-center gap-1.5 m-0 p-0">
          <CalendarIcon className="h-4 w-4 text-primary" />
          오늘의 일정
        </CardTitle>
        <div className="flex items-center gap-1.5 md:gap-2">
          {/* 즐겨찾기 필터 (모조) */}
          <div className="flex items-center mr-1">
            <div className="flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-muted-foreground bg-muted/30">
              <span className="text-[15px]">★</span>
              <span className="hidden sm:inline">즐겨찾기</span>
            </div>
          </div>
          {/* 네비게이션 버튼 (모조) */}
          <div className="flex items-center gap-1.5 border-l border-border/60 pl-2 ml-1">
            <div className="h-7 px-2 flex items-center justify-center text-xs font-semibold text-foreground/50 tracking-tight">오늘</div>
            <div className="flex items-center bg-muted/40 rounded-md p-0.5 pointer-events-none opacity-50">
              <div className="h-6 w-6 flex items-center justify-center"><ChevronLeft className="h-4 w-4" /></div>
              <div className="h-6 w-6 flex items-center justify-center"><ChevronRight className="h-4 w-4" /></div>
            </div>
          </div>
        </div>
      </CardHeader>

      <div className="flex-1 overflow-hidden bg-muted/10 p-2.5 md:p-3">
        <div className="flex lg:grid lg:grid-cols-3 gap-3 md:gap-4 h-full w-full">
          {[0, 1, 2].map((colIndex) => (
            <div 
              key={colIndex} 
              className={cn(
                "relative flex-shrink-0 w-full lg:w-auto snap-center flex flex-col bg-background border border-border/50 rounded-xl p-2.5 md:p-3 h-full overflow-hidden",
                colIndex !== 1 && "hidden lg:flex"
              )}
            >
              {/* Column Header Skeleton */}
              <div className="flex items-center gap-2 mb-2 shrink-0 pb-2 border-b border-border/50">
                <div className="w-8 h-4 bg-muted rounded animate-pulse" />
                <div className="w-12 h-4 bg-muted/50 rounded animate-pulse" />
                <span className="text-sm text-muted-foreground mx-0.5">·</span>
                <div className="w-10 h-4 bg-muted/50 rounded animate-pulse" />
              </div>
              
              {/* Events List Skeleton */}
              <div className="flex-1 flex flex-col gap-1.5 overflow-y-hidden relative pt-1.5 pb-4">
                {[...Array(5)].map((_, idx) => (
                  <div key={idx} className="flex flex-col gap-2 p-3 rounded-xl border border-border/40 bg-muted/20 animate-pulse min-h-[64px]">
                    <div className="flex items-center gap-2">
                       <div className="w-10 h-3 bg-muted rounded-full" />
                       <div className="flex-1 h-4 bg-muted rounded" />
                    </div>
                    <div className="w-2/3 h-3 bg-muted/50 rounded" />
                  </div>
                ))}
              </div>
              <div className="absolute bottom-0 left-0 right-0 h-14 bg-gradient-to-t from-background to-transparent pointer-events-none" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
