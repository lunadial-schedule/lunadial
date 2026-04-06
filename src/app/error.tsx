"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw, Home } from "lucide-react";
import { PageContainer } from "@/components/layout/page-container";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // 개발 환경에서는 콘솔을 통해 볼 수 있도록 에러 로깅
    if (process.env.NODE_ENV !== "production") {
      console.error("[Route Error Boundary caught error]:", error);
    }
  }, [error]);

  return (
    <PageContainer className="flex flex-col items-center justify-center min-h-[70vh] text-center p-4">
      <div className="bg-destructive/10 text-destructive p-3.5 rounded-full mb-5">
        <AlertCircle className="h-8 w-8" />
      </div>
      
      <h2 className="text-xl md:text-2xl font-bold tracking-tight mb-2 flex items-center gap-2">
        이용에 불편을 드려 죄송합니다
      </h2>
      <p className="text-muted-foreground text-sm md:text-base mb-8 max-w-md">
        페이지를 불러오는 중 일시적인 오류가 발생했습니다.<br />
        인터넷 연결 상태를 확인하시거나 다시 시도해주세요.
      </p>
      
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button 
          onClick={() => reset()} 
          className="gap-2 font-medium px-6 h-10"
        >
          <RefreshCcw className="h-4 w-4" />
          다시 시도
        </Button>
        <Button 
          onClick={() => window.location.href = '/'} 
          variant="outline"
          className="gap-2 font-medium px-6 h-10"
        >
          <Home className="h-4 w-4" />
          홈으로 가기
        </Button>
      </div>
    </PageContainer>
  );
}
