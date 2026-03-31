import { cache } from "react";
import { addDays } from "date-fns";
import { getHomeSchedules } from "@/app/actions/schedules";

/**
 * 대시보드(메인 페이지) 일정 데이터를 가져온다.
 *
 * React cache를 사용하여 같은 렌더링 사이클 내에서
 * TodayScheduleSection, UpNextSection이 호출해도 DB 쿼리는 1회만 실행된다.
 *
 * 즐겨찾기 데이터는 auth.getUser()를 수반하여 SSR 차단 원인이 되므로,
 * 클라이언트에서 비동기 로드하도록 분리했다.
 */
export const getCachedSchedules = cache(async () => {
  const now = new Date();
  const todayStart = addDays(now, -2);
  const todayEnd = addDays(now, 2);

  const schedulesRes = await getHomeSchedules(todayStart, todayEnd);

  return {
    schedules: schedulesRes.data ?? [],
    now,
  };
});
