"use client"

import * as React from "react"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { updateStreamer } from "@/app/actions/streamers"
import { toast } from "sonner"

interface StreamerEditModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  streamer: any
  onSuccess?: () => void
}

export function StreamerEditModal({ open, onOpenChange, streamer, onSuccess }: StreamerEditModalProps) {
  const [isLoading, setIsLoading] = React.useState(false)

  // 폼 상태
  const [name, setName] = React.useState("")
  const [channelUrl, setChannelUrl] = React.useState("")
  const [imageUrl, setImageUrl] = React.useState("")

  React.useEffect(() => {
    if (open && streamer) {
      setName(streamer.name || "")
      setChannelUrl(streamer.channel_url || "")
      setImageUrl(streamer.image_url || "")
    }
  }, [open, streamer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      toast.error("스트리머 이름을 입력해주세요.")
      return
    }

    setIsLoading(true)
    const { data, error } = await updateStreamer(streamer.id, {
      name: name.trim(),
      channelUrl: channelUrl.trim() || null,
      imageUrl: imageUrl.trim() || null
    })
    setIsLoading(false)

    if (error) {
      toast.error(error)
      return
    }

    toast.success("스트리머 정보가 수정되었습니다.")
    onOpenChange(false)
    window.dispatchEvent(new Event("favoritesUpdated")) // 정보 갱신을 위해 전역 이벤트 호출
    if (onSuccess) onSuccess()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>스트리머 정보 수정</DialogTitle>
          <DialogDescription>
            해당 스트리머의 주요 정보를 편집합니다.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label>스트리머 이름 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} required />
          </div>
          <div className="space-y-2">
            <Label>채널 주소</Label>
            <Input value={channelUrl} onChange={(e) => setChannelUrl(e.target.value)} placeholder="https://chzzk.naver.com/..." />
          </div>
          <div className="space-y-2">
            <Label>프로필 이미지 URL</Label>
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
          </div>
          
          <DialogFooter className="pt-4">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} disabled={isLoading}>
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? "저장 중..." : "저장하기"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
