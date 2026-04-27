/**
 * 메인 페이지 (대시보드) — 서버 컴포넌트
 *
 * 초기 페이지 응답을 빠르게 하기 위해 페이지 껍데기(Shell)와 클라이언트 컴포넌트를 즉시 렌더한다.
 * 데이터 의존성이 있는 컴포넌트는 Suspense로 묶어 별도로 스트리밍(Chunking)되도록 처리한다.
 *
 * - 좌측: 오늘의 일정(TodayScheduleSection)
 * - 우측: 곧 시작(UpNextSection), 현재 라이브(LiveNowCard)
 */
import { LiveNowCard } from "@/components/dashboard/live-now-card";
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog";
import { OAuthCallbackHandler } from "@/components/oauth-callback-handler";
import { PageContainer } from "@/components/layout/page-container";
import { Suspense } from "react";

// Async Server Components (직접 데이터를 fetch)
import { TodayScheduleSection } from "@/components/dashboard/today-schedule-section";
import { UpNextSection } from "@/components/dashboard/up-next-section";

// Skeletons (데이터 로딩 전 즉시 그려지는 껍데기 프레임)
import { TodayScheduleSkeleton } from "@/components/dashboard/today-schedule-skeleton";
import { UpNextSkeleton } from "@/components/dashboard/up-next-skeleton";
import { SectionErrorBoundary } from "@/components/ui/section-error-boundary";


export default function Home() {
  return (
    <>
      <Suspense>
        <OAuthCallbackHandler />
      </Suspense>
      <PageContainer className="pt-6 md:pt-8 min-h-screen lg:py-4">
        


        <div className="flex flex-col lg:grid lg:grid-cols-10 gap-4 lg:gap-6 w-full items-start">
          {/* Left Column wrapper (Desktop: 70%, Mobile: Full width) */}
          <div className="flex flex-col w-full lg:col-span-7 h-full min-w-0 order-1 lg:order-none">
            {/* 데이터 로딩 전에는 껍데기를 즉시 보여주고, 완료 시 실제 일정 리스트를 렌더 */}
            <SectionErrorBoundary fallbackMessage="오늘의 일정을 불러오지 못했습니다.">
              <Suspense fallback={<TodayScheduleSkeleton />}>
                <TodayScheduleSection />
              </Suspense>
            </SectionErrorBoundary>


          </div>

          {/* Right Column wrapper (Desktop: 30%, Mobile: Full width) */}
          <div className="flex flex-col w-full lg:col-span-3 gap-4 lg:gap-6 min-w-0 order-2 lg:order-none">
            <SectionErrorBoundary fallbackMessage="곧 시작할 일정을 불러오지 못했습니다.">
              <Suspense fallback={<UpNextSkeleton />}>
                <UpNextSection />
              </Suspense>
            </SectionErrorBoundary>
            
            <SectionErrorBoundary fallbackMessage="현재 라이브 정보를 불러오지 못했습니다.">
              <LiveNowCard />
            </SectionErrorBoundary>
          </div>
        </div>

        <div className="lg:hidden">
          <CreateScheduleDialog isMobileTrigger />
        </div>
      </PageContainer>
    </>
  );
}
