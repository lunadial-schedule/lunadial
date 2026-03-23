/**
 * 메인 페이지 (대시보드) — 서버 컴포넌트
 *
 * 서버에서 핵심 데이터(일정, 즐겨찾기 이름)를 미리 fetch하여
 * 초기 렌더에 포함시킨다. "오늘의 일정"과 "곧 시작"에 동일한 데이터를
 * 1회 조회 후 전달하여 중복 요청을 제거한다.
 *
 * - 좌측: 오늘의 일정(TodayScheduleCard)
 * - 우측: 곧 시작(UpNextCard), 현재 라이브(LiveNowCard), 트렌딩 카테고리(TrendingCategoriesCard)
 */
import { LiveNowCard } from "@/components/dashboard/live-now-card";
import { TrendingCategoriesCard } from "@/components/dashboard/trending-categories-card";
import { UpNextCard } from "@/components/dashboard/up-next-card";
import { TodayScheduleCard } from "@/components/dashboard/today-schedule-card";
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog";
import { OAuthCallbackHandler } from "@/components/oauth-callback-handler";
import { PageContainer } from "@/components/layout/page-container";
import { Suspense } from "react";
import { addDays, addHours, isAfter, parseISO } from "date-fns";
import { getHomeSchedules, getMyFavoriteStreamerNames } from "@/app/actions/schedules";
import type { HomeSchedule } from "@/app/actions/schedules";

export default async function Home() {
  const now = new Date();

  // 서버에서 병렬로 데이터 fetch — schedules 1회, favorites 1회
  const todayStart = addDays(now, -2);
  const todayEnd = addDays(now, 2);

  const [schedulesRes, favoriteNames] = await Promise.all([
    getHomeSchedules(todayStart, todayEnd),
    getMyFavoriteStreamerNames(),
  ]);

  const allSchedules: HomeSchedule[] = schedulesRes.data ?? [];

  // "곧 시작" 데이터: 현재 이후 24시간 내 일정 최대 5개
  const upNextEnd = addHours(now, 24);
  const upNextEvents = allSchedules
    .filter(e => isAfter(parseISO(e.start_time), now) && !isAfter(parseISO(e.start_time), upNextEnd))
    .slice(0, 5);

  return (
    <>
      <Suspense>
        <OAuthCallbackHandler />
      </Suspense>
      <PageContainer className="pt-6 md:pt-8 min-h-screen lg:py-4">
        <div className="flex flex-col lg:grid lg:grid-cols-10 gap-4 lg:gap-6 w-full items-start">
          {/* Left Column wrapper (Desktop: 70%, Mobile: Full width) */}
          <div className="flex flex-col w-full lg:col-span-7 h-full min-w-0 order-1 lg:order-none">
            <TodayScheduleCard
              initialEvents={allSchedules}
              initialFavoriteNames={favoriteNames}
            />
          </div>

          {/* Right Column wrapper (Desktop: 30%, Mobile: Full width) */}
          <div className="flex flex-col w-full lg:col-span-3 gap-4 lg:gap-6 min-w-0 order-2 lg:order-none">
            <UpNextCard initialEvents={upNextEvents} />
            <LiveNowCard />
            <TrendingCategoriesCard />
          </div>
        </div>

        <div className="lg:hidden">
          <CreateScheduleDialog isMobileTrigger />
        </div>
      </PageContainer>
    </>
  );
}
