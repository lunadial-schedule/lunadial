"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { StreamerMultiInput } from "./streamer-multi-input"
import { extractScheduleFromImage } from "@/app/actions/ai-extract"
import { UploadCloud, Image as ImageIcon, Loader2 } from "lucide-react"

export interface ExtractedScheduleDraft {
  id: string
  isSelected: boolean
  date: string | null
  startTime: string | null
  endTime: string | null
  isAllDay: boolean
  title: string
  streamerName: string | null
  category: string | null
  memo: string | null
  noticeUrl: string
  sourceImageUrl?: string | null
  status: "ready" | "needs_review" | "incomplete" | "duplicate"
  confidence?: number | null
  duplicate?: {
    isDuplicate: boolean
    matchedScheduleId?: string | null
    reason?: string | null
  }
}

interface AiExtractionFormProps {
  onExtractionComplete: (results: ExtractedScheduleDraft[], payload: { streamers: string[], link: string }) => void
  onCancel: () => void
}

export function AiExtractionForm({ onExtractionComplete, onCancel }: AiExtractionFormProps) {
  const [streamers, setStreamers] = React.useState<string[]>([])
  const [link, setLink] = React.useState("")
  const [imageFile, setImageFile] = React.useState<File | null>(null)
  
  const [status, setStatus] = React.useState<"idle" | "loading" | "error">("idle")
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null)

  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    e.stopPropagation()
    const file = e.dataTransfer.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setImageFile(file)
    } else {
      setErrorMsg("이미지 파일만 업로드 가능합니다.")
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!file.type.startsWith("image/")) {
        setErrorMsg("이미지 파일만 업로드 가능합니다.")
        return
      }
      setImageFile(file)
    }
  }

  const isFormValid = streamers.length > 0 && link.trim() !== "" && imageFile !== null

  const handleExtract = async () => {
    if (!isFormValid) return
    setStatus("loading")
    setErrorMsg(null)

    try {
      // Create FormData to simulate MVP action (even though we're mostly mocking)
      const formData = new FormData()
      formData.append("image", imageFile)
      formData.append("streamers", JSON.stringify(streamers))
      formData.append("link", link)

      const result = await extractScheduleFromImage(formData)
      if (result.error) {
        setStatus("error")
        setErrorMsg(result.error)
      } else if (result.data) {
        setStatus("idle")
        onExtractionComplete(result.data, { streamers, link })
      }
    } catch (err: any) {
      setStatus("error")
      setErrorMsg(err.message || "추출 중 알 수 없는 오류가 발생했습니다.")
    }
  }

  return (
    <div className="flex flex-col flex-1 overflow-hidden h-full">
      <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
        <div className="bg-primary/5 text-primary text-sm p-3 rounded-md font-medium">
          이미지에 적힌 일정을 AI가 자동으로 분석하여 초안을 작성합니다.
        </div>

        {errorMsg && (
          <div className="bg-destructive/15 text-destructive text-sm p-3 rounded-md font-medium">
            {errorMsg}
          </div>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium">스트리머 *</label>
          <StreamerMultiInput 
            value={streamers} 
            onChange={setStreamers} 
            placeholder="스트리머 검색 및 추가 (엔터 키)" 
          />
          <p className="text-xs text-muted-foreground">이미지에 여러 명의 일정이 있으면 스트리머를 여러 명 추가하세요.</p>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">공지 링크 *</label>
          <Input 
            type="url" 
            placeholder="https://카페링크..." 
            value={link} 
            onChange={e => setLink(e.target.value)} 
          />
        </div>

        <div className="space-y-2 flex-col flex">
          <label className="text-sm font-medium">스케줄 이미지 *</label>
          <div 
            className="flex-1 w-full flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg transition-colors hover:bg-muted/50 cursor-pointer min-h-[160px]"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            {imageFile ? (
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-10 w-10 text-primary" />
                <span className="text-sm font-medium truncate max-w-[200px]">{imageFile.name}</span>
                <span className="text-xs text-muted-foreground">클릭하여 다른 이미지 선택</span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <UploadCloud className="h-10 w-10" />
                <span className="font-medium text-sm">이미지 드래그 앤 드롭 또는 클릭하여 업로드</span>
                <span className="text-xs">지원 포맷: jpg, png, webp</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef} 
              onChange={handleFileChange}
            />
          </div>
        </div>
      </div>

      <div className="shrink-0 px-6 py-4 border-t flex justify-end gap-2" style={{ paddingBottom: 'calc(1rem + env(safe-area-inset-bottom))' }}>
        <Button variant="ghost" onClick={onCancel} disabled={status === "loading"}>
          취소
        </Button>
        <Button onClick={handleExtract} disabled={!isFormValid || status === "loading"}>
          {status === "loading" ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> 추출 중...</>
          ) : (
            "추출하기"
          )}
        </Button>
      </div>
    </div>
  )
}
