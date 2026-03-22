"use client"

/**
 * 메인 페이지 (대시보드)
 *
 * 좌측: 오늘의 일정(TodayScheduleCard)
 * 우측: 현재 라이브(LiveNowCard), 트렌딩 카테고리(TrendingCategoriesCard), 곧 시작(UpNextCard)
 *
 * 추가 기능:
 * - 웹 푸시 알림 온보딩 배너 (7일간 숨기기, 영구 허용 처리)
 * - 치지직 OAuth 콜백 리다이렉트 처리 (redirectUri가 루트인 경우 우회)
 */
import { LiveNowCard } from "@/components/dashboard/live-now-card";
import { TrendingCategoriesCard } from "@/components/dashboard/trending-categories-card";
import { UpNextCard } from "@/components/dashboard/up-next-card";
import { TodayScheduleCard } from "@/components/dashboard/today-schedule-card";
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import * as React from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();

  React.useEffect(() => {
    // 치지직 OAuth Callback 처리 (redirectUri 가 루트인 경우 우회)
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (code && state) {
      router.replace(`/api/auth/chzzk/callback?code=${code}&state=${state}`);
    } else if (error) {
      router.replace(`/api/auth/chzzk/callback?error=${error}`);
    }
  }, [router, searchParams]);

  return (
    <PageContainer className="pt-6 md:pt-8 min-h-screen lg:py-4">      <div className="flex flex-col lg:grid lg:grid-cols-10 gap-4 lg:gap-6 w-full items-start">
        {/* Left Column wrapper (Desktop: 70%, Mobile: Full width) */}
        <div className="flex flex-col w-full lg:col-span-7 h-full min-w-0 order-1 lg:order-none">
          <TodayScheduleCard />
        </div>

        {/* Right Column wrapper (Desktop: 30%, Mobile: Full width) */}
        <div className="flex flex-col w-full lg:col-span-3 gap-4 lg:gap-6 min-w-0 order-2 lg:order-none">
          <UpNextCard />
          <LiveNowCard />
          <TrendingCategoriesCard />
        </div>
      </div>

      <div className="lg:hidden">
        <CreateScheduleDialog isMobileTrigger />
      </div>
    </PageContainer>
  );
}

export default function Home() {
  return (
    <Suspense>
      <Content />
    </Suspense>
  )
}
