"use client"

import * as React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { FavoriteSearchSheet } from "./favorite-search-sheet"
import { useIsOverlayOpen } from "@/hooks/use-is-overlay-open"

export function AddFavoriteFloatingButton() {
  const [open, setOpen] = React.useState(false)
  const isOverlayOpen = useIsOverlayOpen()

  return (
    <>
      <div className={`fixed bottom-6 right-6 z-50 lg:hidden ${isOverlayOpen ? 'hidden' : 'block'}`}>
        <Button 
          size="lg" 
          className="rounded-full shadow-lg font-semibold px-5 h-14 bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2"
          onClick={() => setOpen(true)}
        >
          <Plus className="h-5 w-5" />
          즐겨찾기 추가
        </Button>
      </div>

      <FavoriteSearchSheet open={open} onOpenChange={setOpen} />
    </>
  )
}
