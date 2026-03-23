import { cache } from "react";
import { addDays } from "date-fns";
import { getHomeSchedules, getMyFavoriteStreamerNames } from "@/app/actions/schedules";

/**
 * 대시보드(메인 페이지) 초기 렌더링에 필요한 데이터를 병렬로 가져온다.
 * React cache를 사용하여 같은 렌더링 사이클 내에서 여러 Server Component가 
 * 이 함수를 호출하더라도 DB 쿼리는 한 번만 실행되도록(deduplication) 한다.
 */
export const getCachedDashboardData = cache(async () => {
  // 'now' 기준을 일치시키기 위해 한 번만 생성하여 공유
  const now = new Date();
  const todayStart = addDays(now, -2);
  const todayEnd = addDays(now, 2);

  const [schedulesRes, favoriteNames] = await Promise.all([
    getHomeSchedules(todayStart, todayEnd),
    getMyFavoriteStreamerNames(),
  ]);

  return {
    schedules: schedulesRes.data ?? [],
    favoriteNames,
    now,
  };
});
