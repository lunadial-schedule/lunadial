import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Clock, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";

/**
 * 곧 시작 섹션 스켈레톤
 * UpNextCard의 초기 로딩 지연을 해결하기 위해 외곽 쉘을 즉시 표시하는 용도.
 */
export function UpNextSkeleton() {
  return (
    <Card className="flex flex-col border-border/50 bg-card overflow-hidden lg:h-[810px]">
      <CardHeader className="h-10 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0 space-y-0">
        <CardTitle className="text-[15px] font-bold flex items-center gap-1.5 m-0 text-foreground/70">
          <Clock className="h-4 w-4 text-primary/50" />
          곧 시작
        </CardTitle>
        <Badge variant="secondary" className="text-[10px] px-1.5 h-4.5 font-medium whitespace-nowrap flex items-center m-0 opacity-70">다음 방송 예정</Badge>
      </CardHeader>
      <CardContent className="p-0 flex-1 flex flex-col min-h-0">
        <div className="flex-1 flex flex-col p-2.5 md:p-3 gap-1.5 min-h-0">
          {[...Array(10)].map((_, idx) => (
            <div key={idx} className="flex items-center px-3 py-2 rounded-xl border border-border/40 bg-muted/20 animate-pulse min-h-[50px]">
               <div className="w-[56px] shrink-0 border-r border-border/50">
                 <div className="w-10 h-4 bg-muted rounded" />
               </div>
               <div className="flex-1 flex flex-col gap-1.5 pl-3">
                 <div className="w-20 h-4 bg-muted rounded" />
                 <div className="w-3/4 h-3 bg-muted/50 rounded" />
               </div>
               <div className="shrink-0 pl-2">
                 <div className="w-12 h-3 bg-muted rounded" />
               </div>
            </div>
          ))}
        </div>
      </CardContent>
      <CardFooter className="p-0 shrink-0">
        <div className="w-full h-8.5 flex items-center justify-center text-xs text-muted-foreground/50 border-t border-border/50 bg-muted/10">
          전체 보기
          <ChevronRight className="h-3 w-3 inline-block ml-0.5" />
        </div>
      </CardFooter>
    </Card>
  );
}
