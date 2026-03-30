"use client"

/**
 * 계정 삭제 섹션
 *
 * 계정 설정 페이지 하단에 위치하는 "위험 구역" 카드.
 * Pro / admin 활성 상태이면 삭제 버튼을 비활성화하고 안내 문구를 표시한다.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Trash2 } from "lucide-react"
import { useState } from "react"
import { DeleteAccountDialog } from "./delete-account-dialog"

interface DeleteAccountSectionProps {
  /** Pro 또는 admin 구독 활성 여부 */
  isProOrAdmin: boolean
}

export function DeleteAccountSection({ isProOrAdmin }: DeleteAccountSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)

  return (
    <>
      <Card className="border-destructive/30 bg-destructive/[0.02]">
        <CardHeader>
          <CardTitle className="text-destructive flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            계정 삭제
          </CardTitle>
          <CardDescription className="space-y-1.5 pt-1">
            <span className="block">
              계정을 삭제하면 프로필, 즐겨찾기, 개인 설정 등 사용자 정보가 삭제됩니다.
            </span>
            <span className="block">
              작성한 일정 및 업데이트 로그는 서비스 운영 정책에 따라 익명화 후 유지될 수 있습니다.
            </span>
            <span className="block font-medium text-destructive/80">
              삭제 후에는 복구할 수 없습니다.
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isProOrAdmin && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mb-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800">
              현재 Pro 구독이 활성화되어 있어 먼저 구독 해지가 필요합니다.
            </p>
          )}
          <Button
            variant="destructive"
            disabled={isProOrAdmin}
            onClick={() => setDialogOpen(true)}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            계정 삭제
          </Button>
        </CardContent>
      </Card>

      <DeleteAccountDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </>
  )
}
