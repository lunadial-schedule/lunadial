import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatViewerCount(count: number): string {
  //if (count >= 1000) {
  //  return (count / 1000).toFixed(1) + 'k'
  //}
  return count.toString() + '명'
}
