"use client"

import * as React from "react"

export function useIsOverlayOpen() {
  const [isOpen, setIsOpen] = React.useState(false)

  React.useEffect(() => {
    // 초기 상태 확인 (Radix UI는 모달/시트를 열 때 body에 data-scroll-locked 속성을 추가함)
    if (document.body.hasAttribute("data-scroll-locked")) {
      setIsOpen(true)
    }

    // 변경 감지 옵저버
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
