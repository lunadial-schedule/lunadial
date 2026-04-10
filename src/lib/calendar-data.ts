import { unstable_cache } from "next/cache";
import { getCalendarMonthSchedules, getCalendarDaySchedules } from "@/app/actions/schedules";
import { parseISO, endOfMonth, endOfDay, addDays, startOfWeek, endOfWeek, startOfDay, startOfMonth } from "date-fns";

/**
 * [월간 캘린더 전역 캐시]
 * 60초 TTL을 가진 월간 뷰 전역 캐시입니다.
 * 
 * @param monthStr "yyyy-MM" 형식의 월 문자열
 */
export const getCachedCalendarMonthSchedules = unstable_cache(
  async (monthStr: string) => {
    
    // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
    const timerLabel = `Calendar_Month_Cache_Overhead_${Math.random().toString(36).slice(2, 7)}`;
    console.time(timerLabel);
    const date = parseISO(`${monthStr}-01`);
    const monthStart = startOfMonth(date);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    
    // 5주 또는 6주를 표시하기 위한 계산
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const totalCells = monthStart.getDay() + lastDayOfMonth.getDate();
    const numRows = Math.max(5, Math.ceil(totalCells / 7));
    
    const gridEnd = endOfDay(addDays(gridStart, (numRows * 7) - 1));
    const safeStart = addDays(gridStart, -2);
    const safeEnd = addDays(gridEnd, 2);

    const result = await getCalendarMonthSchedules(safeStart, safeEnd);
    console.timeEnd(timerLabel);
    return result;
  },
  ["calendar-month-schedules"],
  { revalidate: 60, tags: ["calendar-month"] }
);

/**
 * [일간 캘린더 전역 캐시]
 * 60초 TTL을 가진 일간 뷰 전역 캐시입니다.
 * 
 * @param dayStr "yyyy-MM-dd" 형식의 일자 문자열
 */
export const getCachedCalendarDaySchedules = unstable_cache(
  async (dayStr: string) => {
    
    // 매 요청마다 타이머 이름이 고유하게 생성 (중복 방지)
    const timerLabel = `Calendar_Day_Cache_Overhead_${dayStr}_${Math.random().toString(36).slice(2, 7)}`;
    console.time(timerLabel);
    const date = parseISO(dayStr);
    const start = addDays(startOfDay(date), -2); // 타임존 오차 대비 넉넉히 양쪽 범위 확대
    const end = addDays(endOfDay(date), 2);

    const result = await getCalendarDaySchedules(start, end);
    console.timeEnd(timerLabel);
    return result;
  },
  ["calendar-day-schedules"],
  { revalidate: 60, tags: ["calendar-day"] }
);
