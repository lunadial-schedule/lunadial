"use client"

import { LiveNowCard } from "@/components/dashboard/live-now-card";
import { TodayHighlightsCard } from "@/components/dashboard/today-highlights-card";
import { UpNextCard } from "@/components/dashboard/up-next-card";
import { WeeklyCalendarCard } from "@/components/dashboard/weekly-calendar-card";
import { Button } from "@/components/ui/button";
import { BellRing, X } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";
import * as React from "react";
import { toast } from "sonner";

export default function Home() {
  const [showBanner, setShowBanner] = React.useState(false);

  React.useEffect(() => {
    const hideStatus = localStorage.getItem("hidePushBannerUntil");
    if (!hideStatus) {
      setShowBanner(true);
    } else if (hideStatus !== "perm_granted" && new Date(hideStatus) < new Date()) {
      // 7일이 지났다면 다시 표시
      setShowBanner(true);
    }
  }, []);

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
    <PageContainer className="pt-6 md:pt-8 min-h-screen">
      {/* Onboarding Push Banner (Conditional Dummy) */}
      {showBanner && (
        <div className="mb-6 rounded-lg bg-primary/5 border border-primary/20 px-4 py-2 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <BellRing className="h-4 w-4 text-primary shrink-0" />
            <h3 className="font-semibold text-sm truncate">즐겨찾기 스트리머 방송 시작 알림을 받아보세요</h3>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="sm" className="h-7 text-xs text-muted-foreground px-2" onClick={handleDismiss}>나중에</Button>
            <Button size="sm" className="h-7 text-xs px-3" onClick={handleEnablePush}>알림 켜기</Button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: 8-col Weekly Calendar */}
        <div className="lg:col-span-8 flex flex-col">
          <WeeklyCalendarCard />
        </div>

        {/* Right: 4-col Cards Stack */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          <LiveNowCard />
          <TodayHighlightsCard />
          <UpNextCard />
        </div>
      </div>
    </PageContainer>
  );
}
