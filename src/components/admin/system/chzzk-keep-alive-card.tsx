"use client"

/**
 * 관리자 전용 치지직 Keep-alive 실행 카드
 * - 버튼 클릭 시 수동 Keep-alive 실행
 * - 마지막 실행 결과 노출
 */

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Loader2, RefreshCw, AlertCircle, CheckCircle2, History } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import { format } from "date-fns"
import { ko } from "date-fns/locale"

export function ChzzkKeepAliveCard() {
  const [isLoading, setIsLoading] = useState(false)
  const [lastLog, setLastLog] = useState<any>(null)
  const [isFetchingLog, setIsFetchingLog] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    fetchLastLog()
  }, [])

  const fetchLastLog = async () => {
    try {
      setIsFetchingLog(true)
      const { data, error } = await supabase
        .from("chzzk_keep_alive_logs")
        .select("*")
        .order("executed_at", { ascending: false })
        .limit(1)
        .maybeSingle()

      if (error) throw error
      setLastLog(data)
    } catch (error: any) {
      console.error("Failed to fetch logs:", error?.message || error)
      // 테이블이 아직 생성되지 않았거나 권한 문제가 있는 경우에 대한 힌트 제공
      if (error?.code === "PGRST116" || error?.message?.includes("relation") || error?.message?.includes("does not exist")) {
        console.warn("치지직 Keep-alive 로그 테이블을 찾을 수 없거나 권한 정보가 부족합니다.")
      }
    } finally {
      setIsFetchingLog(false)
    }
  }

  const handleKeepAlive = async () => {
    try {
      setIsLoading(true)
      const res = await fetch("/api/admin/system/chzzk-session/keep-alive", {
        method: "POST"
      })

      const result = await res.json()

      if (res.ok) {
        toast.success("치지직 Keep-alive가 성공적으로 실행되었습니다.")
        fetchLastLog()
      } else {
        // 재연동이 필요한 특수 에러 케이스 처리
        if (result.needs_reconnect) {
          let reasonMsg = "치지직 계정 재연동이 필요합니다.";
          if (result.error_type === "FORMAT_ERROR") reasonMsg = "데이터 형식 깨짐: 치지직 계정 재연동이 필요합니다.";
          if (result.error_type === "KEY_MISMATCH") reasonMsg = "암호화 규칙 불일치: 치지직 계정 재연동이 필요합니다.";
          if (result.error_type === "API_UNAUTHORIZED") reasonMsg = "접근 권한 만료: 치지직 계정 재연동이 필요합니다.";

          toast.error(`실행 실패 (${reasonMsg})`, {
            duration: 5000,
          })
        } else {
          toast.error(`Keep-alive 실행 실패: ${result.error || "알 수 없는 오류"}`)
        }
        fetchLastLog()
      }
    } catch (error) {
      console.error(error)
      toast.error("시스템 오류가 발생했습니다.")
      fetchLastLog()
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className={`w-5 h-5 text-[#00FFA3] ${isLoading ? "animate-spin" : ""}`} />
          치지직 Keep-alive 관리
        </CardTitle>
        <CardDescription>
          치지직 API 애플리케이션의 삭제 리스크를 줄이기 위해 수동으로 API 사용 기록을 남깁니다.
          (90일 내에 최소 1회 실행 필요)
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-col gap-4">
          <Button 
            onClick={handleKeepAlive} 
            disabled={isLoading}
            className="w-full bg-[#00FFA3] text-black hover:bg-[#00E592] font-bold h-12 text-lg"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
            ) : (
              <RefreshCw className="w-5 h-5 mr-2" />
            )}
            치지직 Keep-alive 실행
          </Button>

          <div className="p-4 border rounded-lg bg-muted/20 space-y-4">
            <h3 className="font-semibold flex items-center gap-2">
              <History className="w-4 h-4 text-muted-foreground" />
              마지막 실행 결과
            </h3>
            
            {isFetchingLog ? (
              <div className="flex justify-center py-4">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : lastLog ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                  <span className="text-sm text-muted-foreground font-medium">실행 시각</span>
                  <span className="text-sm font-semibold">{format(new Date(lastLog.executed_at), "yyyy년 MM월 dd일 HH:mm:ss", { locale: ko })}</span>
                </div>
                
                <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                  <span className="text-sm text-muted-foreground font-medium">상태</span>
                  {lastLog.status === "success" ? (
                    <span className="flex items-center gap-1 text-emerald-500 font-bold text-sm">
                      <CheckCircle2 className="w-4 h-4" /> 성공
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-rose-500 font-bold text-sm">
                      <AlertCircle className="w-4 h-4" /> 실패
                    </span>
                  )}
                </div>

                {lastLog.status === "success" && (
                  <div className="flex justify-between items-center bg-muted/30 p-2 rounded">
                    <span className="text-sm text-muted-foreground font-medium">채널 정보</span>
                    <span className="text-sm font-semibold">{lastLog.target_channel_name} ({lastLog.target_channel_id?.slice(0, 8)}...)</span>
                  </div>
                )}

                {lastLog.status === "failure" && (
                  <div className="mt-2 text-xs p-3 bg-rose-50 dark:bg-rose-950/20 text-rose-600 dark:text-rose-400 rounded-md border border-rose-200 dark:border-rose-900 flex flex-col gap-1.5">
                    <p className="font-bold flex items-center gap-1.5">
                      <AlertCircle className="w-3 h-3" /> 실행 중 오류 발생
                    </p>
                    <p className="font-medium whitespace-pre-wrap">{lastLog.error_message || "알 수 없는 이유로 토큰 갱신 또는 조회에 실패했습니다."}</p>
                    
                    {/* 에러 원인에 따른 맞춤형 안내 */}
                    {lastLog.error_message?.includes("FORMAT_ERROR") && (
                      <p className="mt-2 text-[11px] opacity-80 border-t border-rose-200 dark:border-rose-900 pt-1.5">
                        ⚠️ <b>데이터 형식 오류</b>: 저장된 토큰의 형식이 깨져있습니다. 치지직 계정을 다시 연동해주세요.
                      </p>
                    )}
                    {lastLog.error_message?.includes("KEY_MISMATCH") && (
                      <p className="mt-2 text-[11px] opacity-80 border-t border-rose-200 dark:border-rose-900 pt-1.5">
                        ⚠️ <b>암호화 체계 불일치</b>: 서버의 암호화 키가 변경되었거나 과거 방식으로 저장되었습니다. 안전을 위해 <b>계정을 재연동</b>해주세요.
                      </p>
                    )}
                    {lastLog.error_message?.includes("API_UNAUTHORIZED") && (
                      <p className="mt-2 text-[11px] opacity-80 border-t border-rose-200 dark:border-rose-900 pt-1.5">
                        ⚠️ <b>접근 권한 만료</b>: 토큰이 만료되었거나 치지직에서 연동이 해제되었습니다. <b>계정을 재연동</b>해주세요.
                      </p>
                    )}
                    {!lastLog.error_message?.includes("FORMAT_ERROR") && !lastLog.error_message?.includes("KEY_MISMATCH") && !lastLog.error_message?.includes("API_UNAUTHORIZED") && (
                      <p className="mt-2 text-[11px] opacity-80 border-t border-rose-200 dark:border-rose-900 pt-1.5">
                        💡 일시적인 네트워크 오류가 아니라면 <b>치지직 계정 재연동</b>이 필요할 수 있습니다.
                      </p>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">
                실행 기록이 없습니다. 버튼을 눌러 첫 실행을 시도해주세요.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
