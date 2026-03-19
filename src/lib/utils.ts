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

/**
 * 주어진 날짜(Date 객체 혹은 ISO 문자열)로부터 현재까지의 경과 시간을 상대적으로 나타낸다.
 * 예: "방금 전", "3분 전", "2시간 전"
 */
export function getRelativeTimeString(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return '';
  
  const time = new Date(dateInput).getTime();
  if (isNaN(time)) return '';
  
  const now = Date.now();
  const diffInSeconds = Math.floor(Math.max(0, now - time) / 1000);
  
  if (diffInSeconds < 60) return '방금 전';
  
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}분 전`;
  
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}시간 전`;
  
  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 30) return `${diffInDays}일 전`;
  
  const diffInMonths = Math.floor(diffInDays / 30);
  if (diffInMonths < 12) return `${diffInMonths}개월 전`;
  
  return `${Math.floor(diffInMonths / 12)}년 전`;
}
