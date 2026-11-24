"use client"

import { cn } from "@/lib/utils"

interface LiveIndicatorProps {
  variant?: "dot" | "badge"
  href?: string | null
  className?: string
}

export function LiveIndicator({
  variant = "dot",
  href,
  className,
}: LiveIndicatorProps) {
  if (variant === "dot") {
    return (
      <span
        className={cn(
          "inline-block w-2 h-2 rounded-full bg-red-500 animate-pulse shrink-0",
          className
        )}
        title="현재 방송 중"
        aria-label="현재 방송 중"
      />
    )
  }

  const badgeContent = (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-sm bg-red-500 text-white text-[10px] font-bold leading-none tracking-tight shrink-0",
        href && "hover:bg-red-600 transition-colors",
        className
      )}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
      LIVE
    </span>
  )

  if (href) {
    return (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        title="실시간 방송 보러가기"
        aria-label="실시간 방송 보러가기"
        className="inline-flex items-center shrink-0"
      >
        {badgeContent}
      </a>
    )
  }

  return badgeContent
}
