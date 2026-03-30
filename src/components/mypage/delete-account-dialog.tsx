"use client"

/**
 * 계정 삭제 확인 다이얼로그
 *
 * 2단계 확인 플로우:
 *   1. 경고 안내 및 삭제 결과 설명
 *   2. "계정 삭제" 문구 직접 입력 → 일치 시에만 최종 삭제 버튼 활성화
 *
 * 보안:
 *   - 중복 클릭 방지 (isDeleting 상태)
 *   - 처리 중 로딩 상태 표시
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { AlertTriangle, Loader2 } from "lucide-react"
import { useState, useCallback } from "react"
import { toast } from "sonner"
import { deleteAccount } from "@/services/account"
import { createClient } from "@/lib/supabase/client"
import { useRouter } from "next/navigation"

/** 사용자가 입력해야 하는 확인 문구 */
const CONFIRMATION_PHRASE = "계정 삭제"

interface DeleteAccountDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteAccountDialog({ open, onOpenChange }: DeleteAccountDialogProps) {
  const [confirmText, setConfirmText] = useState("")
  const [isDeleting, setIsDeleting] = useState(false)
  const router = useRouter()

  const isConfirmed = confirmText.trim() === CONFIRMATION_PHRASE

  const handleClose = useCallback(() => {
    if (isDeleting) return // 처리 중에는 닫기 불가
    setConfirmText("")
    onOpenChange(false)
  }, [isDeleting, onOpenChange])

  const handleDelete = useCallback(async () => {
    if (!isConfirmed || isDeleting) return

    setIsDeleting(true)

    try {
      const result = await deleteAccount()

      if (result.error) {
        toast.error(result.error)
        setIsDeleting(false)
        return
      }

      // 성공: 클라이언트 세션 정리 → 로그아웃 → 리다이렉트
      toast.success("계정이 삭제되었습니다.")

      // 클라이언트 Supabase 세션 무효화
      try {
        const supabase = createClient()
        await supabase.auth.signOut()
      } catch {
        // signOut 실패해도 이미 서버에서 auth가 삭제됨 → 무시
      }

      // 홈으로 리다이렉트
      router.push("/")
      router.refresh()
    } catch {
      toast.error("계정 삭제 중 문제가 발생했습니다. 잠시 후 다시 시도해주세요.")
      setIsDeleting(false)
    }
  }, [isConfirmed, isDeleting, router])

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => { if (isDeleting) e.preventDefault() }}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            정말 계정을 삭제하시겠습니까?
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-3 pt-2">
              <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3 text-sm text-foreground space-y-2">
                <p className="font-medium text-destructive">⚠️ 이 작업은 되돌릴 수 없습니다.</p>
                <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                  <li>프로필, 즐겨찾기, 개인 설정이 <strong className="text-foreground">영구 삭제</strong>됩니다.</li>
                  <li>작성한 일정 및 업데이트 로그는 서비스 운영 정책에 따라 <strong className="text-foreground">익명화 후 유지</strong>될 수 있습니다.</li>
                  <li>삭제 후에는 <strong className="text-foreground">복구할 수 없습니다.</strong></li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-delete" className="text-sm text-foreground">
                  확인을 위해 <strong className="text-destructive">{CONFIRMATION_PHRASE}</strong>를 입력해주세요.
                </Label>
                <Input
                  id="confirm-delete"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder={CONFIRMATION_PHRASE}
                  disabled={isDeleting}
                  autoComplete="off"
                  autoFocus
                />
              </div>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={isDeleting}
          >
            취소
          </Button>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={!isConfirmed || isDeleting}
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                삭제 처리 중...
              </>
            ) : (
              "계정 삭제"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
