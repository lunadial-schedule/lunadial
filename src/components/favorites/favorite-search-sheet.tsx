"use client"

/**
 * 즐겨찾기 검색 시트 — 모바일용 하단 시트
 */

import * as React from "react"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { StreamerSearchSection } from "./streamer-search"
import { Plus } from "lucide-react"
import { useHistoryDialog } from "@/hooks/use-history-dialog"

interface FavoriteSearchSheetProps {
  children?: React.ReactNode
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function FavoriteSearchSheet({ children, open, onOpenChange }: FavoriteSearchSheetProps) {
  // 제어/비제어 하이브리드 지원
  const [internalOpen, setInternalOpen] = React.useState(false)
  const isControlled = open !== undefined
  const isOpen = isControlled ? open : internalOpen
  
  const handleOpenChange = (newOpen: boolean) => {
    if (!isControlled) {
      setInternalOpen(newOpen)
    }
    onOpenChange?.(newOpen)
  }

  useHistoryDialog(isOpen, handleOpenChange, "favorite-search");

  return (
    <Sheet open={isOpen} onOpenChange={handleOpenChange}>
      {children && <SheetTrigger asChild>{children}</SheetTrigger>}
      <SheetContent side="bottom" className="h-[90vh] sm:h-[85vh] px-4 pt-6 pb-0 flex flex-col rounded-t-2xl lg:hidden">
        <SheetHeader className="px-2 pb-2 shrink-0">
          <SheetTitle className="text-left text-xl">스트리머 찾기 및 추가</SheetTitle>
        </SheetHeader>
        
        {/* 스크롤 가능한 영역 (SearchSection 내부가 자체 스크롤되도록 하거나, 여기서 스크롤 감싸주기) */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden px-2 pb-6 pt-2">
          {/* 모달이 열려있을 때만 마운트하여 초기화 상태 유지 */}
          {isOpen && <StreamerSearchSection autoFocus />}
        </div>
      </SheetContent>
    </Sheet>
  )
}
