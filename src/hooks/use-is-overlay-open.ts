"use client"

/**
 * 오버레이(모달/시트) 열림 상태 감지 훅
 *
 * Radix UI 기반 모달/시트가 열릴 때 body에 추가되는
 * data-scroll-locked 속성을 MutationObserver로 감시하여
 * 오버레이가 열려있는지 여부를 반환한다.
 *
 * 사용 예: FAB 버튼을 오버레이가 열렸을 때 숨기기
 */
import * as React from "react"

/** @returns 오버레이(모달/시트)가 열려있으면 true */
export function useIsOverlayOpen() {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    // 초기 상태 확인
    if (document.body.hasAttribute("data-scroll-locked")) {
      setIsOpen(true)
    }

    // body 속성 변경 감지
    const observer = new MutationObserver((mutations) => {
      let changed = false
      mutations.forEach((mutation) => {
        if (mutation.attributeName === "data-scroll-locked") {
          changed = true
        }
      })
      
      if (changed) {
        setIsOpen(document.body.hasAttribute("data-scroll-locked"))
      }
    })

    observer.observe(document.body, { attributes: true })

    return () => observer.disconnect()
  }, [])

  return isOpen
}
