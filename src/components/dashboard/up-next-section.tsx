import { getCachedDashboardData } from "@/lib/dashboard-data";
import { UpNextCard } from "./up-next-card";
import { isAfter, parseISO, addHours } from "date-fns";

/**
 * 곧 시작 섹션 (Server Component)
 * 데이터 패칭을 수행하고 24시간 이내 일정을 필터링해 UpNextCard에 초기 데이터를 주입한다.
 */
export async function UpNextSection() {
  const { schedules, now } = await getCachedDashboardData();
  
  const upNextEnd = addHours(now, 24);
  const upNextEvents = schedules
    .filter(e => isAfter(parseISO(e.start_time), now) && !isAfter(parseISO(e.start_time), upNextEnd))
    .slice(0, 5);
    
  return <UpNextCard initialEvents={upNextEvents} />;
}
