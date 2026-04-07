import { cache } from "react";
import { unstable_cache } from "next/cache";
import { addDays, format } from "date-fns";
import { getHomeSchedules, type HomeSchedule } from "@/app/actions/schedules";

// unstable_cache는 서버 전체 공유 캐시이므로, 날짜 문자열을 키로 사용
const getCachedSchedulesData = unstable_cache(
  async (dateStr: string) => {
    // String 형식을 기준으로 -2일 ~ +2일 조회
    const baseDate = new Date(dateStr);
    const todayStart = addDays(baseDate, -2);
    const todayEnd = addDays(baseDate, 2);

    const schedulesRes = await getHomeSchedules(todayStart, todayEnd);
    return schedulesRes.data ?? [];
  },
  ['home-schedules-cache'],
  { revalidate: 60, tags: ['home-schedules'] }
);

/**
 * 대시보드(메인 페이지) 일정 데이터를 가져온다.
 *
 * React cache를 사용하여 같은 렌더링 사이클 내에서
 * TodayScheduleSection, UpNextSection이 중복 호출해도 DB 쿼리는 1회만,
 * 나아가 unstable_cache를 통해 최대 60초간 전역 캐시를 타게 되어 DB 쿼리 부하가 최소화된다.
 */
export const getCachedSchedules = cache(async () => {
  const now = new Date();
  const dateStr = format(now, "yyyy-MM-dd"); // 오늘 날짜를 기준으로 캐싱 (정확한 시간 X)

  console.time("Dashboard_unstable_cache_overhead");
  const schedules = await getCachedSchedulesData(dateStr);
  console.timeEnd("Dashboard_unstable_cache_overhead");

  return {
    schedules,
    now,
  };
});
