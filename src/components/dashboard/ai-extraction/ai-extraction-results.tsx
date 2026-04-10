"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { ExtractedScheduleDraft } from "./ai-extraction-form"
import { CATEGORY_LIST } from "@/config/categories"
import { getSchedules, createSchedule } from "@/app/actions/schedules"
import { findOrCreateStreamer } from "@/app/actions/streamers"
import { Loader2, ArrowLeft, Plus, AlertCircle, CheckCircle2, Copy } from "lucide-react"
import { StreamerSelector } from "../streamer-selector"
import { StreamerShortInfo } from "@/types/streamer"
import { useAuth } from "@/components/providers/auth-provider"

// Types to match DB format roughly
interface MinSchedule {
  id: string
  title: string
  streamer: string
  start_time: string
  is_all_day: boolean | null
  sourceImageUrl?: string | null
  status: "ready" | "needs_review" | "incomplete" | "duplicate" | "manual"
  confidence?: number | null
}

interface AiExtractionResultsProps {
  results: ExtractedScheduleDraft[]
  payload: { streamers: StreamerShortInfo[], link: string }
  onBack: () => void
  onComplete: () => void
}

export function AiExtractionResults({ results, payload, onBack, onComplete }: AiExtractionResultsProps) {
  const { user } = useAuth()
  const [drafts, setDrafts] = React.useState<ExtractedScheduleDraft[]>(results)
  const [existingSchedules, setExistingSchedules] = React.useState<MinSchedule[]>([])
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [isCheckingDups, setIsCheckingDups] = React.useState(true)
  const [allowDuplicate, setAllowDuplicate] = React.useState(false)

  // Fetch recent schedules to check for duplicates
  React.useEffect(() => {
    async function loadSchedules() {
      // Just fetch schedules from today onwards roughly
      const startDate = new Date()
      startDate.setHours(0, 0, 0, 0)
      const res = await getSchedules(startDate)
      if (res.data) {
        setExistingSchedules(res.data)
      }
      setIsCheckingDups(false)
    }
    loadSchedules()
  }, [])

  // Duplicate Check effect whenever drafts or existingSchedules change
  React.useEffect(() => {
    if (isCheckingDups) return

    setDrafts(prev => prev.map(draft => {
      // If user has already handled it or manually checked, we could skip, but let's always warn
      if (!draft.title || !draft.date) return draft

      // Match logic: Same Streamer AND Same Date AND Same Time/isAllDay
      const isDup = existingSchedules.some(s => {
        if (s.streamer !== draft.streamerName) return false
        
        const sDateLocal = new Date(s.start_time);
        const sDateStr = sDateLocal.getFullYear() + "-" + String(sDateLocal.getMonth()+1).padStart(2, '0') + "-" + String(sDateLocal.getDate()).padStart(2, '0');
        
        if (sDateStr !== draft.date) return false;
        
        if (s.is_all_day === true && draft.isAllDay === true) return true;
        
        const sTimeStr = String(sDateLocal.getHours()).padStart(2, '0') + ":" + String(sDateLocal.getMinutes()).padStart(2, '0');
        if (s.is_all_day === false && draft.isAllDay === false && sTimeStr === draft.startTime) return true;

        return false
      })

      if (isDup && !draft.duplicate?.isDuplicate) {
        return {
          ...draft,
          isSelected: false, // Auto-uncheck
          duplicate: {
            isDuplicate: true,
            reason: "동일한 시간에 일정이 있어 자동 선택 해제되었습니다."
          }
        }
      } else if (!isDup && draft.duplicate?.isDuplicate) {
        // Clearance of duplicate if modified
        return {
          ...draft,
          duplicate: { isDuplicate: false }
        }
      }

      return draft
    }))
  }, [existingSchedules, isCheckingDups]) // Intentionally not including drafts deeply to avoid infinite loop. Just run once after load, or when explicit trigger.
  // Wait, if I don't include drafts, it won't check when user edits. 
  // Let's implement a manual duplicate check function or run it onChange.
  // For safety, I'll export a checker function to use inside onChange.

  const checkForDuplicates = (draft: ExtractedScheduleDraft, schedules: MinSchedule[]) => {
    if (!draft.title || !draft.date) return { isDuplicate: false }
    const isDup = schedules.some(s => {
      if (s.streamer !== draft.streamerName) return false
      
      const sDateLocal = new Date(s.start_time);
      const sDateStr = sDateLocal.getFullYear() + "-" + String(sDateLocal.getMonth()+1).padStart(2, '0') + "-" + String(sDateLocal.getDate()).padStart(2, '0');
      
      if (sDateStr !== draft.date) return false;
      
      if (s.is_all_day === true && draft.isAllDay === true) return true;
      
      const sTimeStr = String(sDateLocal.getHours()).padStart(2, '0') + ":" + String(sDateLocal.getMinutes()).padStart(2, '0');
      if (s.is_all_day === false && draft.isAllDay === false && sTimeStr === draft.startTime) return true;

      return false;
    })
    return { isDuplicate: isDup, reason: isDup ? "동일한 시간에 일정이 있어 자동 선택 해제되었습니다." : null }
  }

  const handleUpdateDraft = (id: string, updates: Partial<ExtractedScheduleDraft>) => {
    setDrafts(prev => prev.map(d => {
      if (d.id !== id) return d
      const updated = { ...d, ...updates }
      
      // Auto duplicate check on edit
      const dupRes = checkForDuplicates(updated, existingSchedules)
      if (dupRes.isDuplicate !== updated.duplicate?.isDuplicate) {
        updated.duplicate = dupRes
        if (dupRes.isDuplicate) updated.isSelected = false
      }
      return updated
    }))
  }

  const handleAddManual = () => {
    const defaultStreamer = payload.streamers[0]
    const newDraft: ExtractedScheduleDraft = {
      id: `manual-${Date.now()}`,
      isSelected: true,
      date: new Date().toISOString().split("T")[0],
      startTime: "",
      endTime: null,
      isAllDay: true,
      title: "",
      streamerName: defaultStreamer?.name || "",
      streamerId: defaultStreamer?.id || null,
      categories: [CATEGORY_LIST[0]?.id || "default"],
      memo: "",
      noticeUrl: payload.link,
      status: "manual"
    }
    setDrafts(prev => [...prev, newDraft])
  }

  const handleSubmit = async () => {
    const selected = drafts.filter(d => d.isSelected)
    if (selected.length === 0) {
      alert("선택된 일정이 없습니다.")
      return
    }

    // Validate required fields (공지 링크는 선택 사항으로 변경됨)
    const invalid = selected.find(d => !d.title || !d.date || !d.streamerId || !d.categories || d.categories.length === 0)
    if (invalid) {
      if (selected.find(d => !d.streamerId)) {
        alert("검색 목록에서 등록된 스트리머를 눌러 선택해주세요.")
      } else {
        alert("선택된 일정 중 필수입력값(제목, 날짜, 카테고리)이 누락된 항목이 있습니다.")
      }
      return
    }

    setIsSubmitting(true)
    let successCount = 0
    let failCount = 0

    const currentYear = new Date().getFullYear();
    const normalizeDateYear = (dateStr: string | null) => {
      if (!dateStr) return null;
      const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (!match) return dateStr;
      const [, , month, day] = match;
      return `${currentYear}-${month}-${day}`;
    };

    for (const draft of selected) {
      // 강제 연도 보정 (최종 저장 직전)
      const finalDate = normalizeDateYear(draft.date) || draft.date;

      const startTimeStr = draft.isAllDay 
        ? `${finalDate}T00:00:00` 
        : `${finalDate}T${draft.startTime || "00:00"}:00`

      const { error } = await createSchedule({
        title: draft.title,
        streamer: draft.streamerName!,
        streamer_id: draft.streamerId!,
        categories: draft.categories || [],
        link: draft.noticeUrl,
        start_time: new Date(startTimeStr).toISOString(),
        end_time: null,
        memo: draft.memo || "",
        is_all_day: draft.isAllDay,
        status: "scheduled"
      }, "bulk")

      if (error) {
        failCount++
        console.error("Error creating schedule:", error)
      } else {
        successCount++
      }
    }

    setIsSubmitting(false)
    alert(`${successCount}개의 일정이 등록되었습니다.\n(제외/실패: ${drafts.length - successCount}개)`)
    
    // Refresh & close
    window.dispatchEvent(new Event("schedulesUpdated"))
    onComplete()
  }

  const selectedCount = drafts.filter(d => d.isSelected).length

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">
      {/* Header Summary */}
      <div className="shrink-0 px-6 py-4 border-b bg-muted/20">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold">총 {drafts.length}개의 일정 후보를 찾았어요</h2>
            {isCheckingDups && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
          </div>
          <Badge variant="outline" className="bg-background">
            확인 필요 {drafts.filter(d => d.status === "needs_review" || d.status === "incomplete").length}개
          </Badge>
        </div>
        <div className="text-xs text-muted-foreground flex flex-col gap-1">
          <span className="truncate">공지 링크: <a href={payload.link} target="_blank" rel="noreferrer" className="text-primary hover:underline">{payload.link}</a></span>
          <span className="truncate">스트리머 후보: {payload.streamers.map(s => s.name).join(", ")}</span>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
        {drafts.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center bg-muted/20 border border-dashed rounded-xl h-[300px]">
            <AlertCircle className="w-10 h-10 text-muted-foreground/50 mb-3" />
            <h3 className="text-sm font-bold mb-1">일정을 추출하지 못했어요</h3>
            <p className="text-xs text-muted-foreground mb-6 max-w-[250px]">
              이미지에 날짜/시간 정보가 없거나 복잡한 형태일 수 있습니다. 이어서 직접 입력할 수 있습니다.
            </p>
            <Button size="sm" onClick={handleAddManual}>
              <Plus className="w-4 h-4 mr-1" /> 직접 일정 입력하기
            </Button>
          </div>
        ) : (
          <>
            {drafts.map((draft, idx) => (
              <div key={draft.id} className={`p-4 border rounded-xl transition-colors ${draft.isSelected ? 'border-primary ring-1 ring-primary/20' : 'bg-muted/30 border-dashed opacity-80'}`}>
                <div className="flex items-start gap-3">
                  <Checkbox 
                    id={`chk-${draft.id}`} 
                    checked={draft.isSelected} 
                    onCheckedChange={(val) => handleUpdateDraft(draft.id, { isSelected: val === true })}
                    disabled={draft.duplicate?.isDuplicate && !allowDuplicate}
                    className="mt-1"
                  />
                  <div className="flex-1 space-y-3">
                    {/* Badges */}
                    <div className="flex flex-wrap items-center gap-1.5 min-h-6">
                      {draft.duplicate?.isDuplicate && (
                        <Badge variant="destructive" className="flex items-center gap-1 text-[10px] px-1.5"><Copy className="w-3 h-3" /> 중복 일정</Badge>
                      )}
                      {!draft.duplicate?.isDuplicate && draft.status === "ready" && (
                        <Badge variant="default" className="bg-green-600 hover:bg-green-700 flex items-center gap-1 text-[10px] px-1.5"><CheckCircle2 className="w-3 h-3" /> 추출 완료</Badge>
                      )}
                      {draft.status === "needs_review" && (
                         <Badge variant="secondary" className="flex items-center gap-1 text-orange-600 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:text-orange-400 text-[10px] px-1.5"><AlertCircle className="w-3 h-3" /> 확인 필요</Badge>
                      )}
                      {draft.status === "incomplete" && (
                         <Badge variant="outline" className="flex items-center gap-1 text-red-600 border-red-200 bg-red-50 text-[10px] px-1.5"><AlertCircle className="w-3 h-3" /> 정보 부족</Badge>
                      )}
                      {draft.status === "manual" && (
                         <Badge variant="outline" className="flex items-center gap-1 text-primary border-primary/30 bg-primary/10 text-[10px] px-1.5"><Plus className="w-3 h-3" /> 직접 추가</Badge>
                      )}
                      {draft.duplicate?.isDuplicate && (
                        <span className="text-[10px] text-destructive ml-1">{draft.duplicate.reason}</span>
                      )}
                    </div>

                    {/* Inline Editing Form */}
                    <div className="space-y-4 mt-2">
                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold ${!draft.title ? 'text-destructive' : 'text-muted-foreground'}`}>제목 *</label>
                        <Input className={`h-8 text-sm font-medium ${!draft.title ? 'border-destructive ring-destructive/20 focus-visible:ring-destructive' : ''}`} placeholder="일정 제목" value={draft.title} onChange={(e) => handleUpdateDraft(draft.id, { title: e.target.value })} />
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold ${!draft.streamerId ? 'text-destructive' : 'text-muted-foreground'}`}>스트리머 *</label>
                        <div className={!draft.streamerId ? "border border-destructive rounded-md" : ""}>
                          <StreamerSelector
                            value={draft.streamerId}
                            onSelect={(s) => handleUpdateDraft(draft.id, { streamerName: s?.name || "", streamerId: s?.id || null })}
                            initialLabel={draft.streamerName || ""}
                            placeholder="스트리머 검색"
                          />
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className={`text-xs font-semibold ${(!draft.categories || draft.categories.length === 0) ? 'text-destructive' : 'text-muted-foreground'}`}>카테고리 *</label>
                        <div className="flex flex-wrap gap-1.5">
                          {CATEGORY_LIST.map(cat => {
                            const isSelected = (draft.categories || []).includes(cat.id);
                            return (
                              <Badge
                                key={cat.id}
                                variant="outline"
                                className={`cursor-pointer border-dashed text-[11px] px-2.5 py-0.5 transition-colors hover:bg-muted ${isSelected ? 'border-primary bg-primary/10 text-primary hover:bg-primary/20 hover:border-primary' : ''}`}
                                onClick={() => {
                                  const curr = draft.categories || [];
                                  handleUpdateDraft(draft.id, {
                                    categories: isSelected ? curr.filter(c => c !== cat.id) : [...curr, cat.id]
                                  })
                                }}
                              >
                                {cat.label}
                              </Badge>
                            )
                          })}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <label className={`text-xs font-semibold ${!draft.date ? 'text-destructive' : 'text-muted-foreground'}`}>시작 시간 *</label>
                          <div className="flex items-center space-x-1.5">
                            <Checkbox id={`allday-${draft.id}`} checked={draft.isAllDay} onCheckedChange={(c) => handleUpdateDraft(draft.id, { isAllDay: c === true, startTime: c === true ? null : draft.startTime })} />
                            <label htmlFor={`allday-${draft.id}`} className="text-[11px] font-medium text-muted-foreground cursor-pointer pt-px">하루 종일</label>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                           <Input type="date" className={`h-8 text-sm flex-1 ${!draft.date ? 'border-destructive ring-destructive/20 focus-visible:ring-destructive' : ''}`} value={draft.date || ""} onChange={(e) => handleUpdateDraft(draft.id, { date: e.target.value })} />
                           {!draft.isAllDay && (
                             <Input type="time" className={`h-8 text-sm flex-1 ${!draft.startTime ? 'border-destructive ring-destructive/20 focus-visible:ring-destructive' : ''}`} value={draft.startTime || ""} onChange={(e) => handleUpdateDraft(draft.id, { startTime: e.target.value })} />
                           )}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-semibold text-muted-foreground">메모</label>
                        <textarea 
                          className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 min-h-[60px] resize-none"
                          placeholder="추가 세부사항을 기록하세요."
                           value={draft.memo || ""} 
                           onChange={(e) => handleUpdateDraft(draft.id, { memo: e.target.value })}
                        />
                      </div>
                    </div>

                  </div>
                </div>
              </div>
            ))}
            
            <div className="pt-2 flex justify-center pb-8">
              <Button variant="outline" size="sm" onClick={handleAddManual} className="border-dashed h-9">
                <Plus className="w-4 h-4 mr-1" />
                일정 추가
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 px-6 py-4 border-t shadow-[0_-4px_10px_-4px_rgba(0,0,0,0.05)] bg-background flex flex-col gap-3">
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-destructive/10 border border-destructive/20 rounded-md">
            <Checkbox id="bulkAllowDup" checked={allowDuplicate} onCheckedChange={(c) => setAllowDuplicate(c === true)} />
            <label htmlFor="bulkAllowDup" className="text-xs font-semibold cursor-pointer text-destructive">
              [관리자] 중복 일괄 무시 (중복 항목 체크 및 강제 등록 허용)
            </label>
          </div>
        )}
        <div className="flex flex-row items-center justify-between" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
          <Button variant="ghost" size="sm" onClick={onBack} disabled={isSubmitting} className="text-muted-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> 다시 추출
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || selectedCount === 0 || isCheckingDups}>
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {selectedCount}개 선택된 일정 등록
          </Button>
        </div>
      </div>
    </div>
  )
}
