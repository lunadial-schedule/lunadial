"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import type { VerifiedMarkType } from "@/types/streamer"

interface VerifiedBadgeProps {
  type?: VerifiedMarkType | null
  className?: string
  size?: number
}

export function VerifiedBadge({ type, className, size = 14 }: VerifiedBadgeProps) {
  const isChallenger = type === "CHALLENGER"
  const src = isChallenger ? "/images/challenger-badge.png" : "/images/partner-badge.png"
  const label = isChallenger ? "챌린저 스트리머" : "파트너 스트리머"

  return (
    <div
      className={cn("relative shrink-0 inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      title={label}
    >
      <Image
        src={src}
        alt={label}
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}
