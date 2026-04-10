"use client";

/**
 * 스케쥴 업데이트 로그 리스트
 * 
 * @param initialLogs 스케쥴 업데이트 로그
 * @param isAdminView 관리자 보기 여부
 * @returns 스케쥴 업데이트 로그 리스트
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { ScheduleUpdateLog } from "@/app/actions/logs";

interface Props {
  initialLogs: ScheduleUpdateLog[];
  isAdminView?: boolean;
}

export function UpdateLogList({ initialLogs, isAdminView = false }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();

  const filterAction = searchParams.get("action") || "all";
  const filterMethod = searchParams.get("method") || "all";

  const updateFilters = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams);
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    params.set("page", "1"); // Reset to page 1 on filter change
    router.push(`${pathname}?${params.toString()}`);
  };

  const getActionBadge = (type: string) => {
    switch (type) {
      case "create": return <Badge className="bg-emerald-500 hover:bg-emerald-600">추가</Badge>;
      case "update": return <Badge className="bg-blue-500 hover:bg-blue-600">수정</Badge>;
      case "delete": return <Badge variant="destructive">삭제</Badge>;
      default: return <Badge>{type}</Badge>;
    }
  };

  const getMethodBadge = (type: string) => {
    switch (type) {
      case "bulk": return <Badge variant="outline" className="border-purple-200 text-purple-700 bg-purple-50">일괄 등록✨</Badge>;
      case "manual": return <Badge variant="outline" className="text-zinc-500 bg-zinc-50 border-zinc-200">직접 입력</Badge>;
      default: return <Badge variant="outline">{type}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="flex flex-wrap gap-4 p-4 rounded-lg border bg-card text-card-foreground">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">액션</label>
          <select 
            value={filterAction} 
            onChange={(e) => updateFilters("action", e.target.value)}
            className="text-sm border rounded bg-background p-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">전체</option>
            <option value="create">추가</option>
            <option value="update">수정</option>
            <option value="delete">삭제</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-muted-foreground whitespace-nowrap">방식</label>
          <select 
            value={filterMethod} 
            onChange={(e) => updateFilters("method", e.target.value)}
            className="text-sm border rounded bg-background p-1.5 focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="all">전체</option>
            <option value="manual">직접 입력</option>
            <option value="bulk">일괄 등록✨</option>
          </select>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {initialLogs.length === 0 ? (
          <div className="flex items-center justify-center p-12 text-muted-foreground border rounded-lg border-dashed text-sm">
            표시할 업데이트 로그가 없습니다.
          </div>
        ) : (
          initialLogs.map((log) => (
            <div key={log.id} className="p-4 rounded-lg border bg-card text-card-foreground space-y-3 relative overflow-hidden">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-border/50 pb-3">
                <div className="flex items-start gap-2 flex-wrap flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {getActionBadge(log.action_type)}
                    {getMethodBadge(log.input_method)}
                  </div>
                  <div className="text-sm font-semibold break-all leading-relaxed max-w-full">
                    <span className="text-primary/80 mr-1">[{log.streamer_name_snapshot}]</span>
                    {log.title_snapshot}
                  </div>
                </div>
                <div className="text-xs text-muted-foreground flex flex-row sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 sm:gap-0 whitespace-nowrap shrink-0 pt-0.5">
                  <span>{format(new Date(log.logged_at), "yyyy-MM-dd HH:mm", { locale: ko })}</span>
                  <span className="opacity-70 sm:mt-0.5">시작: {format(new Date(log.start_at_snapshot), "MM/dd HH:mm", { locale: ko })}</span>
                </div>
              </div>
              
              <div className="flex flex-wrap items-center justify-between gap-y-2 text-sm pt-1">
                <span className="font-medium text-foreground/90 bg-muted px-2 py-0.5 rounded-md text-xs">{log.change_summary || "상태 변경"}</span>
                <span className="text-xs text-muted-foreground/80 flex items-center gap-1.5 opacity-80">
                  {log.actor_role === 'admin' ? (
                    `🛡️ ${log.actor_nickname}`
                  ) : isAdminView ? (
                    `👤 ${log.actor_nickname} (${log.actor_ip || 'Unknown'})`
                  ) : (
                    `👤 ${log.actor_ip_masked || 'Unknown IP'}`
                  )}
                </span>
              </div>

              {log.action_type === 'update' && (log.before_data || log.after_data) && (
                <Accordion type="single" collapsible className="w-full mt-1 border-t border-border/40">
                  <AccordionItem value="details" className="border-none">
                    <AccordionTrigger className="py-2 text-xs text-muted-foreground hover:no-underline hover:text-primary transition-colors">
                      상세 보기
                    </AccordionTrigger>
                    <AccordionContent>
                      <div className="bg-muted/50 p-3 rounded-md text-xs font-mono whitespace-pre-wrap max-h-[300px] overflow-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5 p-2 bg-background/50 rounded border border-destructive/20 border-dashed">
                            <div className="font-semibold text-destructive flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-destructive/80"></span>
                              변경 전
                            </div>
                            <div className="text-muted-foreground pl-3 text-[11px] leading-relaxed break-all">
                              {log.before_data ? JSON.stringify(log.before_data, null, 2) : "데이터 없음"}
                            </div>
                          </div>
                          <div className="space-y-1.5 p-2 bg-background/50 rounded border border-emerald-500/20 border-dashed">
                            <div className="font-semibold text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                              <span className="w-2 h-2 rounded-full bg-emerald-500/80"></span>
                              변경 후
                            </div>
                            <div className="text-muted-foreground pl-3 text-[11px] leading-relaxed break-all">
                              {log.after_data ? JSON.stringify(log.after_data, null, 2) : "데이터 없음"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
