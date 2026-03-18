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
import { BellRing, X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import * as React from "react";
import { toast } from "sonner";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense } from "react";

function Content() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    // 치지직 OAuth Callback 처리 (redirectUri 가 루트인 경우 우회)
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (code && state) {
      router.replace(`/api/auth/chzzk/callback?code=${code}&state=${state}`);
    } else if (error) {
      router.replace(`/api/auth/chzzk/callback?error=${error}`);
    } else {
      const hideStatus = localStorage.getItem("hidePushBannerUntil");
      if (!hideStatus) {
        setShowBanner(true);
      } else if (hideStatus !== "perm_granted" && new Date(hideStatus) < new Date()) {
        setShowBanner(true);
      }
    }
  }, [router, searchParams]);

  const handleDismiss = () => {
    const hideDate = new Date();
    hideDate.setDate(hideDate.getDate() + 7);
    localStorage.setItem("hidePushBannerUntil", hideDate.toISOString());
    setShowBanner(false);
  };

  const handleEnablePush = async () => {
    if (!("Notification" in window)) {
      toast.error("이 브라우저는 웹 푸시 알림을 지원하지 않습니다.");
      return;
    }
    
    // 이미 권한이 있는 경우
    if (Notification.permission === "granted") {
      toast.success("이미 알림이 활성화되어 있습니다.");
      setShowBanner(false);
      localStorage.setItem("hidePushBannerUntil", "perm_granted");
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === "granted") {
      toast.success("알림이 활성화되었습니다.");
      setShowBanner(false);
      localStorage.setItem("hidePushBannerUntil", "perm_granted");
    } else {
      toast("알림 권한이 거부되었습니다. 브라우저 설정에서 허용해주세요.");
    }
  };

  return (
    <PageContainer className="pt-6 md:pt-8 min-h-screen lg:py-4">
      {/* Onboarding Push Banner (Conditional Dummy) */}
      {showBanner && (
        <div className="mb-6 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <BellRing className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm truncate">즐겨찾기 스트리머 방송 시작 알림을 받아보세요</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2" onClick={handleDismiss}>나중에</Button>
            <Button size="sm" className="h-7 text-xs px-1" onClick={handleEnablePush}>알림 켜기</Button>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:grid lg:grid-cols-10 gap-4 lg:gap-6 w-full items-start">
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
