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
    console.time("Calendar_Month_Cache_Overhead");
    const date = parseISO(`${monthStr}-01`);
    const monthStart = startOfMonth(date);
    const gridStart = startOfWeek(monthStart, { weekStartsOn: 0 });
    
    // 5주 또는 6주를 표시하기 위한 계산
    const lastDayOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const totalCells = monthStart.getDay() + lastDayOfMonth.getDate();
    const numRows = Math.max(5, Math.ceil(totalCells / 7));
    
    const gridEnd = endOfDay(addDays(gridStart, (numRows * 7) - 1));

    const result = await getCalendarMonthSchedules(gridStart, gridEnd);
    console.timeEnd("Calendar_Month_Cache_Overhead");
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
    console.time(`Calendar_Day_Cache_Overhead_${dayStr}`);
    const date = parseISO(dayStr);
    const start = startOfDay(date);
    const end = endOfDay(date);

    const result = await getCalendarDaySchedules(start, end);
    console.timeEnd(`Calendar_Day_Cache_Overhead_${dayStr}`);
    return result;
  },
  ["calendar-day-schedules"],
  { revalidate: 60, tags: ["calendar-day"] }
);
