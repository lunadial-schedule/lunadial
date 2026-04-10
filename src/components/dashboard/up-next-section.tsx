import { getCachedSchedules } from "@/lib/dashboard-data";
import { UpNextCard } from "./up-next-card";
import { isAfter, parseISO, addHours } from "date-fns";

/**
 * 곧 시작 섹션 (Server Component)
 *
 * getCachedSchedules()를 공유하여 TodayScheduleSection과 동일 캐시를 사용한다.
 * DB 쿼리 추가 호출 없이 24시간 이내 일정을 필터링해 UpNextCard에 전달한다.
 */
export async function UpNextSection() {
  const { schedules, now } = await getCachedSchedules();
  
  const upNextEnd = addHours(now, 24);
  const upNextEvents = schedules
    .filter(e => isAfter(parseISO(e.start_time), now) && !isAfter(parseISO(e.start_time), upNextEnd))
    .slice(0, 10);
    
  return <UpNextCard initialEvents={upNextEvents} />;
}
