"use client";

import React, { Component, ErrorInfo, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { AlertCircle, RefreshCcw } from "lucide-react";

interface Props {
  children?: ReactNode;
  fallbackMessage?: string;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class SectionErrorBoundary extends Component<Props, State> {
  public override state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    // 다음 렌더링 시 폴백 UI가 보이도록 상태를 업데이트합니다.
    return { hasError: true, error };
  }

  public override componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[SectionErrorBoundary caught error]:", error, errorInfo);
    }
  }

  public resetBoundary = () => {
    this.setState({ hasError: false, error: undefined });
  };

  public override render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center p-6 bg-card border border-border/50 rounded-xl text-center min-h-[200px] w-full h-full">
          <div className="bg-destructive/10 p-2.5 rounded-full mb-3">
            <AlertCircle className="w-6 h-6 text-destructive/80" />
          </div>
          <div className="space-y-1.5 mb-4">
            <h3 className="text-sm font-semibold text-foreground tracking-tight">
              {this.props.fallbackMessage || "섹션을 불러오지 못했습니다."}
            </h3>
            <p className="text-xs text-muted-foreground w-[80%] mx-auto leading-relaxed">
              정보를 가져오는 중 문제가 발생했습니다. 일시적일 수 있으니 다시 시도해주세요.
            </p>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={this.resetBoundary}
            className="text-xs h-8 px-4 font-medium"
          >
            <RefreshCcw className="w-3 h-3 mr-1.5" />
            다시 시도
          </Button>
        </div>
      );
    }

    return this.props.children;
  }
}
