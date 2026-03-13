"use client"

import * as React from "react"
import { Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { addFavorite, removeFavorite } from "@/app/actions/favorites"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

interface FavoriteButtonProps {
  streamerId: string
  initialFavorited: boolean
  className?: string
  onFavoriteChange?: (isFavorited: boolean) => void
}

export function FavoriteButton({ streamerId, initialFavorited, className, onFavoriteChange }: FavoriteButtonProps) {
  const [isFavorited, setIsFavorited] = React.useState(initialFavorited)
  const [isLoading, setIsLoading] = React.useState(false)
  const router = useRouter()

  React.useEffect(() => {
    setIsFavorited(initialFavorited)
  }, [initialFavorited])

  const toggleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation()
    e.preventDefault()

    if (isLoading) return

    // 낙관적 업데이트
    setIsLoading(true)
    const nextState = !isFavorited
    setIsFavorited(nextState)
    if (onFavoriteChange) onFavoriteChange(nextState)

    try {
      if (nextState) {
        const res = await addFavorite(streamerId)
        if (res.error) {
          throw new Error(res.error)
        }
        toast.success("즐겨찾기에 추가되었습니다.")
      } else {
        const res = await removeFavorite(streamerId)
        if (res.error) {
          throw new Error(res.error)
        }
        toast.success("즐겨찾기가 해제되었습니다.")
      }
      window.dispatchEvent(new Event("favoritesUpdated"))
      router.refresh()
    } catch (err: any) {
      // 롤백
      setIsFavorited(!nextState)
      if (onFavoriteChange) onFavoriteChange(!nextState)
      
      const errMsg = err.message || ""
      if (errMsg.includes("Free 플랜은 즐겨찾기를 최대")) {
        if (window.confirm("Free 플랜은 즐겨찾기를 최대 10명까지만 추가할 수 있습니다. Pro 플랜으로 업그레이드하시겠습니까?")) {
          router.push("/pro")
        }
      } else {
        toast.error(errMsg || (nextState ? "즐겨찾기 추가 실패" : "즐겨찾기 해제 실패"), {
          description: errMsg === "로그인이 필요합니다." ? "로그인 후 다시 시도해주세요." : undefined
        })
      }
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "h-8 w-8 shrink-0 rounded-full transition-colors",
        isFavorited ? "text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30" : "text-muted-foreground hover:text-foreground",
        className
      )}
      onClick={toggleFavorite}
      disabled={isLoading}
      title={isFavorited ? "즐겨찾기 해제" : "즐겨찾기 추가"}
    >
      <Heart className={cn("h-4 w-4", isFavorited && "fill-current")} />
      <span className="sr-only">즐겨찾기</span>
    </Button>
  )
}
