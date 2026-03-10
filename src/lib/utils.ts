import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatViewerCount(count: number): string {
  //if (count >= 1000) {
  //  return (count / 1000).toFixed(1) + 'k'
  //}
  return count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") + '명'
}

export function normalizeStreamerName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .replace(/\s+/g, "") // 모든 공백 제거
    .replace(/[^a-z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, ""); // 영문, 숫자, 한글만 유지
}
