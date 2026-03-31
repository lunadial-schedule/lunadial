"use client"

/**
 * 일정 상세 드로어 — 일정 클릭 시 상세 정보 표시 및 수정/삭제
 * URL 연동 (팝스테이트, 직접 진입) 포함 모바일 UI 최적화 적용
 */

import * as React from "react"
import { ExternalLink, Edit2, ShieldAlert, XCircle, Clock, Copy, Link as LinkIcon } from "lucide-react"

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { UpdateScheduleDialog } from "@/components/dashboard/update-schedule-dialog"
import { VerifiedBadge } from "@/components/ui/verified-badge"

import { Schedule, deleteSchedule, getScheduleById } from "@/app/actions/schedules"
import { CATEGORY_LIST } from "@/config/categories"
import { format, parseISO } from "date-fns"
import { ko } from "date-fns/locale"
import { useRouter, useSearchParams } from "next/navigation"
import { useAuth } from "@/components/providers/auth-provider"

interface ScheduleDetailDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule: Schedule | null;
}

export function ScheduleDetailDrawer({
  open,
  onOpenChange,
  schedule: externalSchedule
}: ScheduleDetailDrawerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [isUpdateOpen, setIsUpdateOpen] = React.useState(false);

  const { user } = useAuth();
  
  const [internalSchedule, setInternalSchedule] = React.useState<Schedule | null>(externalSchedule);
  const initialEventId = searchParams.get('event');

  // 외부 schedule prop 연동 — HomeSchedule(최소 필드)로 즉시 표시 후, 상세 데이터 fetch
  React.useEffect(() => {
    if (externalSchedule) {
      setInternalSchedule(externalSchedule);
      // link, memo 등 누락 필드를 보완하기 위해 전체 데이터 조회
      getScheduleById(externalSchedule.id).then(({ data }) => {
        if (data) setInternalSchedule(data);
      });
    }
  }, [externalSchedule]);

  // 1. 직접 URL 진입 (또는 새로고침) 처리
  React.useEffect(() => {
    let isMounted = true;
    const checkDeepLink = async () => {
      if (initialEventId && !open) {
        if (!externalSchedule || externalSchedule.id !== initialEventId) {
          const { data } = await getScheduleById(initialEventId);
          if (data && isMounted) {
            setInternalSchedule(data);
            onOpenChange(true);
          }
        } else {
          onOpenChange(true);
        }
      }
    };
    checkDeepLink();
    return () => { isMounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount only

  // 2. 모바일 뒤로가기 닫힘 대응
  React.useEffect(() => {
    const handlePopState = () => {
      if (open) {
        onOpenChange(false);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [open, onOpenChange]);

  // 3. 열릴 때 history push
  React.useEffect(() => {
    if (open && internalSchedule) {
      const url = new URL(window.location.href);
      if (url.searchParams.get('event') !== internalSchedule.id) {
        url.searchParams.set('event', internalSchedule.id);
        window.history.pushState({ drawer: internalSchedule.id }, '', url.toString());
      }
    }
  }, [open, internalSchedule]);

  // 내부 모달 컨트롤 핸들러
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && open) {
      const url = new URL(window.location.href);
      if (url.searchParams.has('event')) {
        url.searchParams.delete('event');
        window.history.replaceState(null, '', url.toString());
      }
    }
    onOpenChange(newOpen);
  };

  const handleUpdateClick = () => {
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    setIsUpdateOpen(true);
  };

  const handleDelete = async () => {
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    if (!confirm("이 일정을 삭제하시겠습니까?")) return;
    if (!internalSchedule) return;
    
    setIsDeleting(true);
    const { error } = await deleteSchedule(internalSchedule.id);
    setIsDeleting(false);
    if (error) {
      alert("삭제 실패: " + error);
    } else {
      handleOpenChange(false);
      window.dispatchEvent(new CustomEvent("schedulesUpdated", { 
        detail: { action: 'delete', scheduleId: internalSchedule.id } 
      }));
    }
  };

  if (!internalSchedule) return null;

  // 카테고리 정렬
  const currentCategories = internalSchedule.categories || [];
  const sortedCategories = [...currentCategories].sort((a, b) => {
    const idxA = CATEGORY_LIST.findIndex(c => c.id === a);
    const idxB = CATEGORY_LIST.findIndex(c => c.id === b);
    return (idxA === -1 ? 99 : idxA) - (idxB === -1 ? 99 : idxB);
  });
  const categoryInfos = sortedCategories.map(id => CATEGORY_LIST.find(c => c.id === id)).filter(Boolean) as typeof CATEGORY_LIST;
  if (categoryInfos.length === 0) categoryInfos.push(CATEGORY_LIST[0]);

  let linkDomain = internalSchedule.link;
  try {
    linkDomain = new URL(internalSchedule.link).hostname;
  } catch(e) { }

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-[500px] border-l p-0 flex flex-col min-h-[100dvh]">
        
        {/* 모바일 시트 핸들 바 (작은 화면에서만 보임, 터치 무시) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden shrink-0 mt-3 absolute top-0 left-0 right-0 z-50 pointer-events-none">
          <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full" />
        </div>

        {/* Scrollable Body */}
        <div className="flex-1 overflow-y-auto px-5 py-8 sm:px-8 flex flex-col mt-4 sm:mt-0 pb-10">
          
          <SheetHeader className="text-left pb-6 border-b border-border/60 shrink-0">
            <SheetDescription className="sr-only">일정 상세내용</SheetDescription>
            
            <div className="flex flex-wrap items-center gap-2 mb-3">
              {categoryInfos.map(info => (
                <Badge key={info.id} variant="default" className="text-[11px] px-2 h-[22px] rounded-md border-0" style={{ backgroundColor: info.color.replace('bg-', '') }}>
                  {info.label}
                </Badge>
              ))}
              {internalSchedule.status === "changed" && <Badge variant="secondary" className="text-[11px] px-2 h-[22px] rounded-md bg-amber-500 text-white border-0">변경됨</Badge>}
              {internalSchedule.status === "canceled" && <Badge variant="secondary" className="text-[11px] px-2 h-[22px] rounded-md bg-zinc-500 text-white border-0">취소됨</Badge>}
            </div>
            
            <SheetTitle className="text-[22px] sm:text-[24px] font-bold leading-[1.3] tracking-tight text-foreground pr-6 whitespace-pre-wrap break-words">
              {internalSchedule.title}
            </SheetTitle>
            
            <div className="flex items-center gap-2.5 mt-4">
              <Avatar className="h-7 w-7 border border-border/80 shadow-sm">
                <AvatarImage src={(internalSchedule as any).streamers?.image_url || undefined} />
                <AvatarFallback className="bg-primary/5 text-primary text-[10px] font-bold">{internalSchedule.streamer.slice(0, 1)}</AvatarFallback>
              </Avatar>
              <div className="flex items-center gap-1">
                <span className="font-bold text-[15px] text-foreground/90">{internalSchedule.streamer}</span>
                {(internalSchedule as any).streamers?.verified_mark && <VerifiedBadge size={14} />}
              </div>
            </div>
          </SheetHeader>

          <div className="flex flex-col gap-6 pt-6 shrink-0 h-fit">
            
            {/* Section 1: 일정 정보 */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center gap-3.5 bg-muted/40 p-4 rounded-[16px] border border-border/50">
                <div className="h-[42px] w-[42px] rounded-full bg-background border border-border/60 flex items-center justify-center shrink-0 shadow-sm">
                  <Clock className="w-[18px] h-[18px] text-foreground/70" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[15px] font-bold text-foreground">
                    {format(parseISO(internalSchedule.start_time), "yyyy년 M월 d일 (eee)", { locale: ko })}
                  </span>
                  {internalSchedule.is_all_day ? (
                    <span className="text-[15px] font-semibold text-primary/80 mt-0.5">하루 종일</span>
                  ) : (
                    <span className="text-[15px] font-semibold text-muted-foreground mt-0.5">
                      {format(parseISO(internalSchedule.start_time), "a h:mm", { locale: ko })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            
            {/* Section 2: 공지 링크 */}
            <div className="flex flex-col gap-2.5">
              <div className="flex items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-[16px] border border-border/80 shadow-sm relative group overflow-hidden">
                <div className="flex items-center gap-3.5 min-w-0 z-10 flex-1">
                  <div className="h-[38px] w-[38px] rounded-full bg-blue-500/10 flex items-center justify-center shrink-0">
                    <LinkIcon className="w-[16px] h-[16px] text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="flex flex-col min-w-0 flex-1">
                    <span className="text-[12px] font-bold text-foreground/70 truncate flex items-center gap-1.5">
                      {linkDomain}
                    </span>
                    <a href={internalSchedule.link} target="_blank" rel="noreferrer" className="text-[14px] font-semibold text-blue-500 hover:text-blue-600 hover:underline truncate mt-0.5 w-full block">
                      {internalSchedule.link}
                    </a>
                  </div>
                </div>
                <div className="shrink-0 flex items-center z-10 pl-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-9 w-9 text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-full focus-visible:ring-0 focus-visible:bg-muted/80"
                    onClick={() => {
                      navigator.clipboard.writeText(internalSchedule.link);
                      const el = document.getElementById(`copy-tooltip-${internalSchedule.id}`);
                      if (el) {
                         el.style.opacity = "1";
                         el.style.transform = "translateY(0)";
                         setTimeout(() => {
                            el.style.opacity = "0";
                            el.style.transform = "translateY(4px)";
                         }, 2000);
                      }
                    }}
                  >
                    <Copy className="h-[15px] w-[15px]" />
                  </Button>
                </div>
                <div 
                  id={`copy-tooltip-${internalSchedule.id}`}
                  className="absolute right-4 top-0 mt-2 bg-foreground text-background text-[11px] font-bold px-2.5 py-1 rounded-md opacity-0 translate-y-1 transition-all duration-200 pointer-events-none z-20 shadow-md"
                >
                  복사완료
                </div>
              </div>
            </div>

            {/* Section 3: 메모 */}
            {(internalSchedule.memo && internalSchedule.memo.trim() !== "") && (
              <div className="flex flex-col gap-2.5">
                <div className="p-4 sm:p-5 rounded-[16px] border shadow-sm relative overflow-hidden flex flex-col gap-2">
                   <p className="text-[14.5px] leading-[1.65] whitespace-pre-wrap ml-1.5 font-medium text-foreground/90 break-words">
                    {internalSchedule.memo}
                  </p>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Sticky Action Footer */}
        <div className="shrink-0 px-5 py-4 pb-8 sm:px-8 sm:py-5 sm:pb-6 border-t border-border/50 bg-background mt-auto shadow-[0_-15px_30px_-15px_rgba(0,0,0,0.06)] relative z-20">
          <div className="flex gap-2.5 w-full max-w-sm mx-auto sm:max-w-none">
            <Button className="flex-1 font-bold h-[48px] text-[15px] rounded-xl shadow-sm border-border/80" variant="outline" onClick={handleUpdateClick}>
              <Edit2 className="w-[16px] h-[16px] mr-2" />
              정보 수정
            </Button>
            <Button 
              className="flex-1 font-bold h-[48px] text-[15px] rounded-xl text-red-600 dark:text-red-400 border-red-200 dark:border-red-900/40 hover:bg-red-50 dark:hover:bg-red-950/20 shadow-sm transition-colors" 
              variant="outline" 
              onClick={handleDelete}
              disabled={isDeleting}
            >
              <XCircle className="w-[16px] h-[16px] mr-2" />
              {isDeleting ? "삭제 중..." : "일정 삭제"}
            </Button>
          </div>
        </div>
      </SheetContent>

      <UpdateScheduleDialog 
        open={isUpdateOpen} 
        onOpenChange={setIsUpdateOpen} 
        schedule={internalSchedule}
        onSuccess={(updatedSchedule) => {
          setInternalSchedule(updatedSchedule);
          setIsUpdateOpen(false);
          handleOpenChange(false);
          window.dispatchEvent(new CustomEvent("schedulesUpdated", { 
            detail: { action: 'update', schedule: updatedSchedule } 
          }));
        }} 
      />
    </Sheet>
  )
}
