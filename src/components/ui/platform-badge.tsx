"use client"

import Image from "next/image"
import { cn } from "@/lib/utils"
import {
  detectPlatform,
  getPlatformLabel,
  getStreamerChannelUrl,
  type PlatformType,
} from "@/lib/platform"

interface PlatformBadgeProps {
  channelUrl?: string | null
  channelId?: string | null
  size?: number
  className?: string
}

function PlatformIcon({ platform, size }: { platform: PlatformType; size: number }) {
  if (platform === "chzzk") {
    return (
      <Image
        src="/chzzk-logo.png"
        alt="치지직"
        width={size}
        height={size}
        className="rounded-[4px] object-contain"
      />
    )
  }

  if (platform === "soop") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="rounded-[4px]"
      >
        <rect width="24" height="24" rx="5" fill="#0066FF" />
        <text
          x="12"
          y="16.2"
          textAnchor="middle"
          fill="#FFFFFF"
          fontSize="12"
          fontWeight="800"
          fontFamily="sans-serif"
        >
          S
        </text>
      </svg>
    )
  }

  if (platform === "youtube") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        aria-hidden="true"
        className="rounded-[4px]"
      >
        <rect width="24" height="24" rx="5" fill="#FF0000" />
        <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#FFFFFF" />
      </svg>
    )
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
      className="rounded-[4px]"
    >
      <rect width="24" height="24" rx="5" fill="#9146FF" />
      <path d="M7 6H18V14L15 17H12L10 19V17H7V6Z" fill="#FFFFFF" />
    </svg>
  )
}

export function PlatformBadge({
  channelUrl,
  channelId,
  size = 18,
  className,
}: PlatformBadgeProps) {
  const platform = detectPlatform(channelUrl, channelId)
  const href = getStreamerChannelUrl(channelUrl, channelId)

  if (!platform || !href) return null

  const label = getPlatformLabel(platform)

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={(e) => e.stopPropagation()}
      title={`${label} 방송국으로 이동`}
      aria-label={`${label} 방송국으로 이동`}
      className={cn(
        "relative shrink-0 inline-flex items-center justify-center rounded-[4px] hover:opacity-80 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50",
        className
      )}
      style={{ width: size, height: size }}
    >
      <PlatformIcon platform={platform} size={size} />
    </a>
  )
}
