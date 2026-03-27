"use client"

/**
 * 일정 수정 다이얼로그
 */;

import * as React from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CATEGORY_LIST } from "@/config/categories";
import { updateSchedule, type Schedule } from "@/app/actions/schedules";
import { findOrCreateStreamer } from "@/app/actions/streamers";
import { format, parseISO } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { StreamerAutocompleteInput } from "./streamer-autocomplete-input";

interface UpdateScheduleDialogProps {
  schedule: Schedule;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function UpdateScheduleDialog({ schedule, open, onOpenChange, onSuccess }: UpdateScheduleDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  const [selectedCats, setSelectedCats] = React.useState<string[]>([]);
  const [isAllDay, setIsAllDay] = React.useState<boolean>(false);
  const [startTime, setStartTime] = React.useState("");
  const [streamerName, setStreamerName] = React.useState("");
  const [streamerId, setStreamerId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setSelectedCats(schedule.categories || []);
      setIsAllDay(schedule.is_all_day || false);
      if (schedule.is_all_day) {
        setStartTime(schedule.start_time ? format(parseISO(schedule.start_time), "yyyy-MM-dd") : "");
      } else {
        setStartTime(schedule.start_time ? format(parseISO(schedule.start_time), "yyyy-MM-dd'T'HH:mm") : "");
      }
      setStreamerName(schedule.streamer || "");
      setStreamerId(schedule.streamer_id || null);
      setErrorMsg(null);
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
    
    const formData = new FormData(e.currentTarget);
    const title = formData.get("title") as string;
    const streamer = formData.get("streamer") as string;
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

    if (!streamerId) {
      setErrorMsg("검색 목록에서 등록된 스트리머를 눌러 선택해주세요.");
      setIsLoading(false);
      return;
    }
    
    // server action updateSchedule(id, updates, currentUpdatedAt)
    const startTimeStr = isAllDay ? `${startTime}T00:00:00` : startTime;
    const { data, error, conflict } = await updateSchedule(
      schedule.id, 
      {
        title,
        streamer: streamerName,
        streamer_id: streamerId,
        categories: selectedCats,
        link,
        status,
        memo: memo || "",
        is_all_day: isAllDay,
        start_time: new Date(startTimeStr).toISOString(),
      },
      schedule.updated_at
    );
    
    setIsLoading(false);
    
    if (error) {
      if (conflict) {
        setErrorMsg("다른 사용자가 이미 이 일정을 수정했습니다. 창을 닫고 최신 데이터를 확인해주세요.");
      } else {
        setErrorMsg("일정 수정 실패: " + error);
      }
    } else {
      onSuccess?.();
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
        <form onSubmit={onSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
             <label className="text-sm font-medium">제목 *</label>
             <Input name="title" required defaultValue={schedule.title} />
          </div>
          <div className="space-y-2">
             <label className="text-sm font-medium">스트리머 *</label>
             <StreamerAutocompleteInput
               name="streamer_input_text"
               value={streamerName}
               onTextChange={(val) => {
                 setStreamerName(val);
                 setStreamerId(null);
               }}
               onSelectStreamer={(id, name) => {
                 setStreamerName(name);
                 setStreamerId(id);
               }}
               required={true}
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
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "저장 중..." : "변경사항 저장"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
