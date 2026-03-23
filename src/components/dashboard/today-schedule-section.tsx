import { getCachedDashboardData } from "@/lib/dashboard-data";
import { TodayScheduleCard } from "./today-schedule-card";

/**
 * 오늘의 일정 섹션 (Server Component)
 * 데이터 패칭을 수행하고 TodayScheduleCard에 초기 데이터를 주입한다.
 */
export async function TodayScheduleSection() {
  const { schedules, favoriteNames } = await getCachedDashboardData();
  
  return (
    <TodayScheduleCard 
      initialEvents={schedules} 
      initialFavoriteNames={favoriteNames} 
    />
  );
}
