"use client"

/**
 * 일정 수정 다이얼로그
 */;

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LIST } from "@/config/categories";
import { updateSchedule, checkDuplicateSchedule, type Schedule } from "@/app/actions/schedules";
import { findOrCreateStreamer } from "@/app/actions/streamers";
import Link from "next/link";
import { AlertCircle, Info } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StreamerSelector } from "./streamer-selector";
import { StreamerShortInfo } from "@/types/streamer";

interface UpdateScheduleDialogProps {
  schedule: Schedule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (updatedSchedule: Schedule) => void;
}

export function UpdateScheduleDialog({ schedule, open, onOpenChange, onSuccess }: UpdateScheduleDialogProps) {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [duplicateInfo, setDuplicateInfo] = React.useState<any>(null);
  const [hasSameDateInfo, setHasSameDateInfo] = React.useState<any>(null);
  const [allowDuplicate, setAllowDuplicate] = React.useState(false);

  const [selectedCats, setSelectedCats] = React.useState<string[]>([]);
  const [isAllDay, setIsAllDay] = React.useState<boolean>(false);
  const [startTime, setStartTime] = React.useState("");
  const [streamer, setStreamer] = React.useState<StreamerShortInfo | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedCats(schedule.categories || []);
      setIsAllDay(schedule.is_all_day || false);
      if (schedule.is_all_day) {
        setStartTime(schedule.start_time ? format(parseISO(schedule.start_time), "yyyy-MM-dd") : "");
      } else {
        setStartTime(schedule.start_time ? format(parseISO(schedule.start_time), "yyyy-MM-dd'T'HH:mm") : "");
      }
      setStreamer(schedule.streamer_id ? { id: schedule.streamer_id, name: schedule.streamer || "" } : null);
      setErrorMsg(null);
      setDuplicateInfo(null);
      setHasSameDateInfo(null);
      setAllowDuplicate(false);
    }
  }, [open, schedule]);

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
    setIsLoading(true);
    setErrorMsg(null);
    setDuplicateInfo(null);
    setHasSameDateInfo(null);
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const link = formData.get("link") as string;
    
    // 공지 링크 미입력 시 확인 알림
    if (!link.trim()) {
      if (!window.confirm("공지 링크를 입력하지 않았습니다. 계속하시겠습니까?")) {
        setIsLoading(false);
        return;
      }
    }
    
    const status = formData.get("status") as string;
    const memo = formData.get("memo") as string;

    if (selectedCats.length === 0) {
      setErrorMsg("적어도 하나 이상의 카테고리를 선택해주세요.");
      setIsLoading(false);
      return;
    }

    if (!streamer?.id) {
      setErrorMsg("등록된 스트리머를 선택해야 저장할 수 있습니다.");
      setIsLoading(false);
      return;
    }
    
    // server action updateSchedule(id, updates, currentUpdatedAt)
    const startTimeStr = isAllDay ? `${startTime}T00:00:00` : startTime;
    const isoString = new Date(startTimeStr).toISOString();

    if (!allowDuplicate) {
      const { isDuplicate, duplicateInfo: dupInfo, hasSameDateInfo: sameDateInfo } = await checkDuplicateSchedule(
        streamer.id,
        isoString,
        isAllDay,
        schedule.id
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

    const { data, error, conflict } = await updateSchedule(
      schedule.id, 
      {
        title,
        streamer: streamer.name,
        streamer_id: streamer.id,
        categories: selectedCats,
        link,
        status,
        memo: memo || "",
        is_all_day: isAllDay,
        start_time: isoString,
      },
      schedule.updated_at,
      allowDuplicate
    );
    
    setIsLoading(false);
    
    if (error) {
      if (conflict) {
        setErrorMsg("다른 사용자가 이미 이 일정을 수정했습니다. 창을 닫고 최신 데이터를 확인해주세요.");
      } else {
        setErrorMsg("일정 수정 실패: " + error);
      }
    } else {
      if (data) {
        onSuccess?.(data);
      } else {
        onSuccess?.(schedule); // fail-safe if data is missing, which shouldn't happen
      }
      onOpenChange(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>일정 수정</DialogTitle>
          <DialogDescription>
            등록된 일정의 상세 정보를 수정합니다. 누구나 수정 가능하므로 동시 편집 시 주의해 주세요.
          </DialogDescription>
        </DialogHeader>
        {errorMsg && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md font-medium">
            {errorMsg}
          </div>
        )}

        {duplicateInfo && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3 space-y-3 mt-4">
            <div className="flex items-start gap-2 text-destructive">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-sm font-medium">동일한 시간에 등록된 일정이 존재하여 변경할 수 없습니다.</div>
            </div>
            <div className="bg-background/60 rounded px-2.5 py-2 text-xs text-muted-foreground ml-6 shadow-sm border border-border/50">
              <div className="flex justify-between items-center gap-2">
                <div className="font-medium">
                  <span className="text-foreground">{duplicateInfo.streamer}</span> - {duplicateInfo.title}
                  <div className="mt-0.5">
                    {duplicateInfo.is_all_day ? "하루 종일" : format(new Date(duplicateInfo.start_time), "yyyy-MM-dd HH:mm")}
                  </div>
                </div>
              </div>
            </div>
            {user?.role === 'admin' && (
              <div className="ml-6 pt-1 flex items-center gap-2">
                <Checkbox id="updateAllowDup" checked={allowDuplicate} onCheckedChange={(c) => setAllowDuplicate(c === true)} />
                <label htmlFor="updateAllowDup" className="text-xs font-semibold cursor-pointer text-destructive">
                  [관리자] 중복 경고를 무시하고 강제로 저장합니다.
                </label>
              </div>
            )}
          </div>
        )}

        {!duplicateInfo && hasSameDateInfo && (
          <div className="bg-blue-50/50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-3 mt-4">
            <div className="flex items-start gap-2 text-blue-700 dark:text-blue-400">
              <Info className="w-4 h-4 mt-0.5 shrink-0" />
              <div className="text-sm font-medium">
                참고: 해당 날짜에 이미 다른 일정({hasSameDateInfo.is_all_day ? "하루 종일" : format(new Date(hasSameDateInfo.start_time), "HH:mm")})이 등록되어 있습니다. 변경 내용 저장은 정상적으로 가능합니다.
              </div>
            </div>
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
             <label className="text-sm font-medium">제목 *</label>
             <Input name="title" required defaultValue={schedule.title} />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">스트리머 *</label>
             <StreamerSelector
               value={streamer?.id || null}
               onSelect={setStreamer}
               initialLabel={schedule.streamer || ""}
               placeholder="스트리머 검색"
             />
          </div>
          <div className="space-y-4">
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
               <label className="text-sm font-medium">진행 상태 *</label>
               <select name="status" required defaultValue={schedule.status} className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-1 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50">
                 <option value="scheduled">예정 (정상)</option>
                 <option value="changed">일정 변경됨</option>
                 <option value="canceled">일정 취소됨</option>
               </select>
            </div>
          </div>
          <div className="space-y-2">
             <div className="flex items-center justify-between">
               <label className="text-sm font-medium">시작 시간 *</label>
               <div className="flex items-center space-x-2">
                 <Checkbox id="updateAllDay" checked={isAllDay} onCheckedChange={(c) => handleAllDayChange(c === true)} />
                 <label htmlFor="updateAllDay" className="text-sm text-muted-foreground cursor-pointer">하루 종일</label>
               </div>
             </div>
             <Input type={isAllDay ? "date" : "datetime-local"} name="start_time" required value={startTime} onChange={(e) => setStartTime(e.target.value)} />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">공지 링크</label>
             <Input type="url" name="link" defaultValue={schedule.link} />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">메모</label>
             <textarea 
               name="memo" 
               defaultValue={schedule.memo || ""} 
               rows={3}
               className="flex w-full rounded-md border border-input bg-background px-1 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
               placeholder=" 추가 세부사항을 기록하세요."
             />
          </div>
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>취소</Button>
            <Button type="submit" disabled={isLoading || !streamer?.id}>
              {isLoading ? "저장 중..." : !streamer?.id ? "스트리머를 선택해주세요" : "변경사항 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
