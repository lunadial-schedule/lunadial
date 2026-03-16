/**
 * 페이지 컨테이너 — 공통 max-width 및 패딩 래퍼
 */
import * as React from "react"
import { cn } from "@/lib/utils"

interface PageContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
}

export function PageContainer({ className, children, ...props }: PageContainerProps) {
  return (
    <div 
      className={cn("mx-auto w-full max-w-[1400px] px-3 min-[361px]:px-4 md:px-5 lg:px-6", className)} 
      {...props}
    >
      {children}
    </div>
  )
}
