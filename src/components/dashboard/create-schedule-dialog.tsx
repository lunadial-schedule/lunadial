"use client"

/**
 * 일정 생성 다이얼로그 — 폼 입력, AI 자동 파싱, 중복 검사 지원
 */;

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LIST } from "@/config/categories";
import { createSchedule, checkDuplicateSchedule } from "@/app/actions/schedules";
import { Plus, AlertCircle, ExternalLink, Info } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { TITLE_PLACEHOLDERS, STREAMER_PLACEHOLDERS } from "@/config/placeholders";
import { findOrCreateStreamer } from "@/app/actions/streamers";
import { StreamerSelector } from "./streamer-selector";
import { StreamerShortInfo } from "@/types/streamer";
import { useIsOverlayOpen } from "@/hooks/use-is-overlay-open";
import { AiExtractionTab } from "./ai-extraction/ai-extraction-tab";
import { useAuth } from "@/components/providers/auth-provider";

interface CreateScheduleDialogProps {
  isMobileTrigger?: boolean;
}

export function CreateScheduleDialog({ isMobileTrigger = false }: CreateScheduleDialogProps = {}) {
  const isOverlayOpen = useIsOverlayOpen();
  const router = useRouter();
  const { user } = useAuth();
  const [open, setOpen] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = React.useState<any>(null);
  const [hasSameDateInfo, setHasSameDateInfo] = React.useState<any>(null);
  const [allowDuplicate, setAllowDuplicate] = React.useState(false);
  
  const [isAllDay, setIsAllDay] = React.useState(true);
  const [selectedCats, setSelectedCats] = React.useState<string[]>([]);
  const [startTime, setStartTime] = React.useState("");
  
  // 스트리머 입력 관리를 위한 상태
  const [streamer, setStreamer] = React.useState<StreamerShortInfo | null>(null);

  const [titlePlaceholder, setTitlePlaceholder] = React.useState("예: 마크 대규모 합방");
  const [streamerPlaceholder, setStreamerPlaceholder] = React.useState("예: 풍월량");
  const prevTitleRef = React.useRef<string | null>(null);
  const prevStreamerRef = React.useRef<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setIsAllDay(true);
      setStartTime(format(new Date(), "yyyy-MM-dd"));
      setSelectedCats([]);
      setErrorMsg(null);
      setDuplicateInfo(null);
      setHasSameDateInfo(null);
      setAllowDuplicate(false);
      setStreamer(null);

      let newTitle = TITLE_PLACEHOLDERS[Math.floor(Math.random() * TITLE_PLACEHOLDERS.length)];
      while (TITLE_PLACEHOLDERS.length > 1 && newTitle === prevTitleRef.current) {
        newTitle = TITLE_PLACEHOLDERS[Math.floor(Math.random() * TITLE_PLACEHOLDERS.length)];
      }
      setTitlePlaceholder(newTitle);
      prevTitleRef.current = newTitle;

      let newStreamer = STREAMER_PLACEHOLDERS[Math.floor(Math.random() * STREAMER_PLACEHOLDERS.length)];
      while (STREAMER_PLACEHOLDERS.length > 1 && newStreamer === prevStreamerRef.current) {
        newStreamer = STREAMER_PLACEHOLDERS[Math.floor(Math.random() * STREAMER_PLACEHOLDERS.length)];
      }
      setStreamerPlaceholder(newStreamer);
      prevStreamerRef.current = newStreamer;
    }
  }, [open]);

  const handleAllDayChange = (checked: boolean) => {
    setIsAllDay(checked);
    if (checked) {
      setStartTime(format(new Date(), "yyyy-MM-dd"));
    } else {
      setStartTime(format(new Date(), "yyyy-MM-dd'T'HH:mm"));
    }
  };

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (selectedCats.length === 0) {
      alert("적어도 하나 이상의 카테고리를 선택해주세요.");
      return;
    }
    setIsLoading(true);
    setErrorMsg(null);
    setDuplicateInfo(null);
    setHasSameDateInfo(null);
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const link = formData.get("link") as string;
    const memo = formData.get("memo") as string;
    
    // 공지 링크 미입력 시 확인 알림
    if (!link.trim()) {
      if (!window.confirm("공지 링크를 입력하지 않았습니다. 계속하시겠습니까?")) {
        setIsLoading(false);
        return;
      }
    }
    
    if (!streamer?.id) {
      setErrorMsg("등록된 스트리머를 선택해야 저장할 수 있습니다.");
      setIsLoading(false);
      return;
    }

    // 하루 종일일 경우, 시간 부분을 00:00으로 강제
    const startTimeStr = isAllDay ? `${startTime}T00:00:00` : startTime;
    const isoString = new Date(startTimeStr).toISOString();

    // 1.5. 중복 여부 확인
    if (!allowDuplicate) {
      const { isDuplicate, duplicateInfo: dupInfo, hasSameDateInfo: sameDateInfo } = await checkDuplicateSchedule(
        streamer.id,
        isoString,
        isAllDay
      );

      if (isDuplicate && dupInfo) {
        setDuplicateInfo(dupInfo);
        setHasSameDateInfo(null);
        setIsLoading(false);
        return; // 차단
      } else if (sameDateInfo) {
        setHasSameDateInfo(sameDateInfo);
      }
    }
    
    // 2. 일정 생성 (streamer_id 연결)
    const { data, error } = await createSchedule({
      title,
      streamer: streamer.name,
      streamer_id: streamer.id,
      categories: selectedCats,
      link,
      start_time: isoString,
      end_time: null,
      memo: memo || "",
      is_all_day: isAllDay,
      status: "scheduled"
    }, 'manual', allowDuplicate);
    
    setIsLoading(false);
    
    if (error) {
      setErrorMsg("일정 추가 실패: " + error);
    } else {
      setOpen(false);
      window.dispatchEvent(new Event("schedulesUpdated"));
      router.refresh();
    }
  }

  const handleOpenClick = () => {
    if (!user) {
      if (window.confirm("로그인이 필요한 서비스입니다. 로그인 하시겠습니까?")) {
        router.push("/login");
      }
      return;
    }
    setOpen(true);
  };

  return (
    <>
      {isMobileTrigger ? (
        <Button 
          type="button"
          aria-label="새 일정 등록"
          className={`fixed z-[100] h-14 lg:hidden rounded-full px-5 shadow-lg font-semibold bg-primary text-primary-foreground hover:bg-primary/90 transition-transform active:scale-95 items-center justify-center gap-2 ${isOverlayOpen ? 'hidden' : 'flex'}`}
          style={{ 
            bottom: 'calc(1.5rem + env(safe-area-inset-bottom))', 
            right: 'calc(1.5rem + env(safe-area-inset-right))' 
          }}
          onClick={handleOpenClick}
        >
          <Plus className="h-5 w-5" />
          일정 추가
        </Button>
      ) : (
        <Button 
          type="button"
          variant="outline" 
          size="sm" 
          className="rounded-full gap-1" 
          onClick={handleOpenClick}
        >
          <Plus className="h-4 w-4" />
          <span>일정 추가</span>
        </Button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[425px] flex flex-col p-0 gap-0 max-h-[90dvh] md:max-h-[85vh] overflow-hidden">
          <DialogHeader className="px-6 pt-6 pb-4 shrink-0 border-b">
            <DialogTitle>새 일정 등록</DialogTitle>
            <DialogDescription>
              스트리머의 새로운 방송 일정을 등록합니다.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="manual" className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 pt-4 shrink-0">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">직접 입력</TabsTrigger>
                <TabsTrigger value="ai">일괄 등록(Beta)✨</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent forceMount value="manual" className="flex-1 flex-col overflow-hidden m-0 data-[state=active]:flex data-[state=inactive]:hidden">
              <form onSubmit={onSubmit} className="flex flex-col flex-1 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              {errorMsg && (
                <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md font-medium">
                  {errorMsg}
                </div>
              )}

              {duplicateInfo && (
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-3">
                  <div className="flex items-start gap-2 text-destructive">
                    <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="text-sm font-medium">동일한 시간에 등록된 일정이 존재하여 등록할 수 없습니다.</div>
                  </div>
                  <div className="bg-background/60 rounded px-2.5 py-2 text-xs text-muted-foreground ml-6 shadow-sm border border-border/50">
                    <div className="flex justify-between items-center gap-2">
                      <div className="font-medium">
                        <span className="text-foreground">{duplicateInfo.streamer}</span> - {duplicateInfo.title}
                        <div className="mt-0.5">
                          {duplicateInfo.is_all_day ? "하루 종일" : format(new Date(duplicateInfo.start_time), "yyyy-MM-dd HH:mm")}
                        </div>
                      </div>
                      <Button asChild variant="secondary" size="sm" className="h-7 text-[10px] px-2 shrink-0" onClick={() => setOpen(false)}>
                        <Link href={`/?date=${format(new Date(duplicateInfo.start_time), "yyyy-MM-dd")}`}>
                          기존 일정 보기
                        </Link>
                      </Button>
                    </div>
                  </div>
                  {user?.role === 'admin' && (
                    <div className="ml-6 pt-1 flex items-center gap-2">
                      <Checkbox id="allowDup" checked={allowDuplicate} onCheckedChange={(c) => setAllowDuplicate(c === true)} />
                      <label htmlFor="allowDup" className="text-xs font-semibold cursor-pointer text-destructive">
                        [관리자] 중복 경고를 무시하고 강제로 저장합니다.
                      </label>
                    </div>
                  )}
                </div>
              )}

              {!duplicateInfo && hasSameDateInfo && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3">
                  <div className="flex items-start gap-2 text-blue-700 dark:text-blue-400">
                    <Info className="w-4 h-4 mt-0.5 shrink-0" />
                    <div className="text-sm font-medium">
                      참고: 해당 날짜에 이미 다른 일정({hasSameDateInfo.is_all_day ? "하루 종일" : format(new Date(hasSameDateInfo.start_time), "HH:mm")})이 등록되어 있습니다. 서로 다른 시간대이므로 등록은 정상적으로 가능합니다.
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                 <label className="text-sm font-medium">제목 *</label>
                 <Input name="title" required placeholder={`${titlePlaceholder}`} />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">스트리머 *</label>
                 <StreamerSelector
                   value={streamer?.id || null}
                   onSelect={setStreamer}
                   placeholder={streamerPlaceholder}
                 />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">카테고리 *</label>
                 <div className="flex flex-wrap gap-2">
                   {CATEGORY_LIST.map(cat => {
                     const isSelected = selectedCats.includes(cat.id);
                     return (
                       <Badge
                         key={cat.id}
                         variant="outline"
                         className={`cursor-pointer border-dashed transition-colors hover:bg-muted ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary' : ''}`}
                         onClick={() => {
                           setSelectedCats(prev => prev.includes(cat.id) ? prev.filter(c => c !== cat.id) : [...prev, cat.id])
                         }}
                       >
                         {cat.label}
                       </Badge>
                     )
                   })}
                 </div>
              </div>

              <div className="space-y-2">
                 <div className="flex items-center justify-between">
                   <label className="text-sm font-medium">시작 시간 *</label>
                   <div className="flex items-center space-x-2">
                     <Checkbox id="isAllDay" checked={isAllDay} onCheckedChange={(c) => handleAllDayChange(c === true)} />
                     <label htmlFor="isAllDay" className="text-sm text-muted-foreground cursor-pointer">하루 종일</label>
                   </div>
                 </div>
                 <Input type={isAllDay ? "date" : "datetime-local"} name="start_time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">공지 링크</label>
                 <Input type="url" name="link" placeholder="https://..." />
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium">메모</label>
                 <textarea 
                   name="memo" 
                   rows={2}
                   className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 min-h-[80px]"
                   placeholder="추가 세부사항을 기록하세요."
                 />
              </div>
            </div>

            <DialogFooter 
              className="shrink-0 px-6 py-4 border-t shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] bg-background flex flex-row justify-end gap-2"
              style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}
            >
              <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isLoading} className="flex-1 sm:flex-none">
                취소
              </Button>
              <Button type="submit" disabled={isLoading || !streamer?.id} className="flex-1 sm:flex-none">
                {isLoading ? "등록 중..." : !streamer?.id ? "스트리머를 선택해주세요" : "등록하기"}
              </Button>
            </DialogFooter>
          </form>
            </TabsContent>
            
            <TabsContent forceMount value="ai" className="flex-1 flex-col overflow-hidden m-0 data-[state=active]:flex data-[state=inactive]:hidden">
              <AiExtractionTab onOpenChange={setOpen} />
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </>
  )
}
