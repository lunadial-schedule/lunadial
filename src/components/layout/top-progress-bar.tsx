"use client";

/**
 * TopProgressBar — 전역 페이지 이동 프로그레스 바
 *
 * 동작 원리:
 * 1. document 레벨에서 <a> 클릭(Link 포함)과 popstate(뒤로/앞으로)를 가로채서 "이동 시작" 감지
 * 2. pathname/searchParams 변경으로 "이동 완료" 감지
 * 3. 150ms 지연: 초고속 이동 시 깜빡임 방지 (bar가 보이기 전에 이동 완료되면 표시 생략)
 * 4. 최소 표시 시간 300ms: 바가 보였다면 자연스러운 완료 애니메이션을 보장
 *
 * 예외 처리:
 * - 같은 URL 재이동 / 외부 링크 / target="_blank" / 앵커(#) 전용 이동은 무시
 * - 모달/탭 등 URL 변경 없는 상호작용에는 반응하지 않음
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const DELAY_BEFORE_SHOW_MS = 150;
const MIN_DISPLAY_MS = 300;
const FINISH_ANIMATION_MS = 400;

type BarPhase = "idle" | "waiting" | "running" | "finishing";

export function TopProgressBar() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [phase, setPhase] = useState<BarPhase>("idle");

  const delayTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const finishTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showTimeRef = useRef(0);
  const phaseRef = useRef<BarPhase>("idle");

  // phaseRef는 이벤트 핸들러에서 최신 phase에 접근하기 위한 ref
  phaseRef.current = phase;

  const clearAllTimers = useCallback(() => {
    if (delayTimerRef.current) {
      clearTimeout(delayTimerRef.current);
      delayTimerRef.current = null;
    }
    if (finishTimerRef.current) {
      clearTimeout(finishTimerRef.current);
      finishTimerRef.current = null;
    }
  }, []);

  /** 이동 시작 시 호출 */
  const startNavigation = useCallback(() => {
    const currentPhase = phaseRef.current;
    if (currentPhase === "running" || currentPhase === "finishing") return;

    clearAllTimers();
    setPhase("waiting");

    delayTimerRef.current = setTimeout(() => {
      setPhase("running");
      showTimeRef.current = Date.now();
      delayTimerRef.current = null;
    }, DELAY_BEFORE_SHOW_MS);
  }, [clearAllTimers]);

  /** 이동 완료 시 호출 */
  const finishNavigation = useCallback(() => {
    const currentPhase = phaseRef.current;

    if (currentPhase === "waiting") {
      // 지연 시간 내에 이동 완료 → 바를 보여주지 않고 바로 idle
      clearAllTimers();
      setPhase("idle");
      return;
    }

    if (currentPhase === "running") {
      clearAllTimers();
      const elapsed = Date.now() - showTimeRef.current;
      const remaining = Math.max(0, MIN_DISPLAY_MS - elapsed);

      finishTimerRef.current = setTimeout(() => {
        setPhase("finishing");
        finishTimerRef.current = setTimeout(() => {
          setPhase("idle");
        }, FINISH_ANIMATION_MS);
      }, remaining);
    }
  }, [clearAllTimers]);

  // --- 1) 이동 "시작" 감지: <a> 클릭 + popstate ---
  const currentUrlRef = useRef(typeof window !== "undefined" ? window.location.pathname + window.location.search : "");
  
  // 라우트가 변경되어 렌더링이 일어날 때마다 현재 URL을 기록
  useEffect(() => {
    const searchString = searchParams.toString();
    currentUrlRef.current = pathname + (searchString ? `?${searchString}` : "");
  }, [pathname, searchParams]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const anchor = (e.target as HTMLElement)?.closest("a");
      if (!anchor) return;

      // 외부 링크, 새 탭, 다운로드 등은 무시
      if (
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        e.ctrlKey ||
        e.metaKey ||
        e.shiftKey ||
        e.altKey ||
        e.button !== 0
      ) {
        return;
      }

      const href = anchor.getAttribute("href");
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
        return;
      }

      // 외부 도메인 링크 무시
      try {
        const url = new URL(href, window.location.origin);
        if (url.origin !== window.location.origin) return;

        // 같은 URL이면 무시
        const currentUrl = window.location.pathname + window.location.search;
        const targetUrl = url.pathname + url.search;
        if (currentUrl === targetUrl) return;
      } catch {
        return;
      }

      startNavigation();
    };

    const handlePopState = () => {
      // popstate 이벤트 시점에서의 브라우저 네이티브 URL
      const newUrl = window.location.pathname + window.location.search;
      // 이전의 Next.js 라우트 기반 URL과 다를 경우에만 이동으로 간주
      // (모달의 useHistoryDialog 동작처럼 URL 변경 없이 pushState/back 한 경우는 무시)
      if (newUrl !== currentUrlRef.current) {
        startNavigation();
      }
    };

    document.addEventListener("click", handleClick, { capture: true });
    window.addEventListener("popstate", handlePopState);

    return () => {
      document.removeEventListener("click", handleClick, { capture: true });
      window.removeEventListener("popstate", handlePopState);
      clearAllTimers();
    };
  }, [startNavigation, clearAllTimers]);

  // --- 2) 이동 "완료" 감지: pathname/searchParams 변경 ---
  const routeKey = `${pathname}?${searchParams.toString()}`;
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    finishNavigation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [routeKey]);

  if (phase === "idle" || phase === "waiting") return null;

  return (
    <div
      role="progressbar"
      aria-label="페이지 로딩 중"
      className={`top-progress-bar ${phase === "finishing" ? "top-progress-bar--finishing" : ""}`}
    />
  );
}
