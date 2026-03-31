import { getCachedSchedules } from "@/lib/dashboard-data";
import { TodayScheduleCard } from "./today-schedule-card";

/**
 * 오늘의 일정 섹션 (Server Component)
 *
 * 일정 데이터만 SSR로 패칭하여 TodayScheduleCard에 즉시 전달한다.
 * 즐겨찾기 데이터는 TodayScheduleCard 내부에서 클라이언트 지연 로드한다.
 * → auth.getUser() 호출 없이 순수 DB 쿼리만으로 SSR이 완료되어 응답이 빨라진다.
 */
export async function TodayScheduleSection() {
  const { schedules } = await getCachedSchedules();
  
  return (
    <TodayScheduleCard 
      initialEvents={schedules} 
    />
  );
}
