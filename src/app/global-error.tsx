"use client";

import "@/app/globals.css";
import { Inter } from "next/font/google";
import { Button } from "@/components/ui/button";
import { AlertTriangle, RefreshCcw } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

// 주의: global-error는 프로덕션에서만 작동하며 디버깅 모드(root) 레이아웃 에러를 처리하기 위해 html, body 태그를 직접 포함해야 합니다.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="ko">
      <body className={inter.className}>
        <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
          <div className="bg-destructive/10 text-destructive p-4 rounded-full mb-6">
            <AlertTriangle className="h-10 w-10" />
          </div>
          
          <h1 className="text-2xl font-bold tracking-tight mb-3">시스템에 치명적인 문제가 발생했습니다</h1>
          <p className="text-muted-foreground max-w-md mx-auto mb-8 text-sm md:text-base leading-relaxed">
            화면을 표시하는 중 예상치 못한 오류가 발생했습니다.<br />
            일시적인 현상일 수 있으니 새로고침을 시도해주세요.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={() => reset()} 
              className="gap-2 w-full sm:w-auto h-11"
            >
              <RefreshCcw className="h-4 w-4" />
              다시 시도
            </Button>
            <Button 
              onClick={() => window.location.href = '/'} 
              variant="outline"
              className="w-full sm:w-auto h-11 font-medium bg-background"
            >
              홈으로 가기
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
