/**
 * 공용 유틸리티 함수
 */
import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

/**
 * Tailwind CSS 클래스명을 병합한다.
 * clsx로 조건부 클래스를 처리한 뒤 tailwind-merge로 충돌을 해소한다.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * 시청자 수를 한국어 표기로 포맷한다.
 * 예: 1234 → "1,234명"
 */
export function formatViewerCount(count: number): string {
  return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '명'
}

/**
 * 스트리머 이름을 검색용으로 정규화한다.
 * 소문자 변환 → 공백 제거 → 영문/숫자/한글만 유지
 * 예: "김 도!" → "김도"
 */
export function normalizeStreamerName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s+/g, "") // 모든 공백 제거
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, ""); // 영문, 숫자, 한글만 유지
}
