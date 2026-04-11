"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

interface AdSlotProps {
  iframeSrc: string;
  desktopHeight: number;
  mobileHeight: number;
  lazy?: boolean;
  className?: string;
}

/**
 * 환경변수나 컴포넌트 프롭스로 받은 광고를 실제로 클라이언트에 렌더링하는 컴포넌트입니다.
 * - iframe을 주로 활용하며
 * - CLS(Layout Shift) 방지를 위해 내부 inline css style(--ad-height)을 활용해 미리 높이를 확보합니다.
 */
export function AdSlot({
  iframeSrc,
  desktopHeight,
  mobileHeight,
  lazy = false,
  className,
}: AdSlotProps) {
  const [isVisible, setIsVisible] = React.useState(true);

  if (!iframeSrc || !isVisible) return null;

  return (
    <div
      className={cn(
        "w-full flex flex-col items-center justify-center relative min-h-[var(--ad-mobile-height)] md:min-h-[var(--ad-desktop-height)] mb-4",
        className
      )}
      style={
        {
          "--ad-mobile-height": `${mobileHeight}px`,
          "--ad-desktop-height": `${desktopHeight}px`,
        } as React.CSSProperties
      }
    >
      <span className="text-[9px] font-semibold text-muted-foreground/40 self-end mr-4 mb-2 tracking-wider">
        AD
      </span>

      <div
        className="w-full flex justify-center object-contain"
        style={
          {
            "--ad-mobile-height": `${mobileHeight}px`,
            "--ad-desktop-height": `${desktopHeight}px`,
          } as React.CSSProperties
        }
      >
        <iframe
          src={iframeSrc}
          title="Advertisement"
          className="w-full bg-transparent max-w-full h-[var(--ad-mobile-height)] md:h-[var(--ad-desktop-height)] rounded-md"
          loading={lazy ? "lazy" : "eager"}
          referrerPolicy="unsafe-url"
          style={{ border: "none" }}
          onError={() => {
            // 참고: CORS 및 보안 정책으로 인해 광고 차단 시 브라우저가 onError를 항상 
            // 안정적으로 호출해주지는 않지만, 가능한 대응으로 숨김 처리
            console.warn("Ad content failed to load.");
            setIsVisible(false);
          }}
        />
      </div>
    </div>
  );
}
