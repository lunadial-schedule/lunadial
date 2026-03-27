"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"

interface VerifiedBadgeProps {
  className?: string
  size?: number
}

export function VerifiedBadge({ className, size = 14 }: VerifiedBadgeProps) {
  return (
    <div className={cn("relative shrink-0 inline-flex items-center justify-center", className)} style={{ width: size, height: size }}>
      <Image
        src="/images/partner-badge.png"
        alt="Verified Partner"
        width={size}
        height={size}
        className="object-contain"
        priority
      />
    </div>
  )
}
