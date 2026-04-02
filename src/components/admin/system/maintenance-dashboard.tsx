"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { Loader2, Zap, ShieldAlert, Users, Database, Link as LinkIcon, Info, Play, FileJson } from "lucide-react"
import { format } from "date-fns"
import { ko } from "date-fns/locale"
import { getMaintenanceStats, revalidateAdminSystemPath } from "@/app/actions/admin-maintenance-stats"

type MaintenanceTask = {
  id: string
  title: string
  description: string
  icon: any
  endpoint: string
  color: string
}

const MAINTENANCE_TASKS: MaintenanceTask[] = [
  {
    id: "load-streamers",
    title: "최상위 스트리머 로드",
    description: "치지직 랭킹 API를 기반으로 상위 스트리머들을 시스템에 대량(Mock/Real) 적재하거나 팔로워를 갱신합니다.",
    icon: Users,
    endpoint: "/api/admin/system/maintenance/load-streamers",
    color: "text-blue-500",
  },
  {
    id: "backfill-ids",
    title: "채널 ID 백필 매칭",
    description: "이름만 있고 채널 ID가 없는 스트리머들을 식별하여 자동 검색 및 채널 ID를 채워 넣습니다.",
    icon: LinkIcon,
    endpoint: "/api/admin/system/maintenance/backfill-streamer-channel-ids",
    color: "text-purple-500",
  },
  {
    id: "clean-streamers",
    title: "이름 오염/휴방 데이터 정리",
    description: "미정, - 등 비정상적인 이름의 스트리머를 비활성화하고 본명 변경 및 별칭(Alias)을 정리합니다.",
    icon: Database,
    endpoint: "/api/admin/system/maintenance/clean-streamers",
    color: "text-amber-500",
  }
]

export function MaintenanceDashboard() {
  const [stats, setStats] = useState<{ totalActive: number, missingChannelId: number, lastVerifiedUpdateAt: string | null } | null>(null)
  const [isStatsLoading, setIsStatsLoading] = useState(true)
  
  // 상태별 캐시 (로컬 스토리지 연동 없이 탭 유지하는 동안이라도 먼저)
  // 추후 브라우저 로컬스토리지 연동으로 고도화 가능
  const [taskState, setTaskState] = useState<Record<string, {
    isLoading: boolean
    isDryRunActive: boolean
    lastResult: any
    lastRunAt: string | null
    lastRunMode: "dry-run" | "execution" | null
  }>>({})

  useEffect(() => {
    fetchStats()
    // LocalStorage에서 초기 상태 복원
    const savedState = localStorage.getItem("lunadial_maintenance_state")
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        // 로딩 상태는 무조건 false로 초기화
        Object.keys(parsed).forEach(k => {
          parsed[k].isLoading = false
          parsed[k].isDryRunActive = false
        })
        setTaskState(parsed)
      } catch (e) {
        // ignore
      }
    } else {
      // 빈 껍데기 포맷 초기화
      const init: any = {}
      MAINTENANCE_TASKS.forEach(t => {
        init[t.id] = { isLoading: false, isDryRunActive: false, lastResult: null, lastRunAt: null, lastRunMode: null }
      })
      setTaskState(init)
    }
  }, [])

  // 상태 캐싱 헬퍼
  const updateTaskState = (id: string, updates: any) => {
    setTaskState(prev => {
      const nextState = {
        ...prev,
        [id]: { ...prev[id], ...updates }
      }
      // 로컬스토리지에도 동기화
      localStorage.setItem("lunadial_maintenance_state", JSON.stringify(nextState))
      return nextState
    })
  }

  const fetchStats = async () => {
    setIsStatsLoading(true)
    try {
      const data = await getMaintenanceStats()
      setStats(data)
    } catch (e) {
      console.error(e)
    } finally {
      setIsStatsLoading(false)
    }
  }

  const handleRunTask = async (task: MaintenanceTask, isDryRun: boolean) => {
    const confirmMessage = isDryRun
      ? `[${task.title}] 상태 점검(Dry-run)을 시작합니다. DB 수정은 발생하지 않습니다.`
      : `[${task.title}] 작업을 실행하시겠습니까? 데이터(DB)가 실제로 변경됩니다.`

    if (!confirm(confirmMessage)) return

    try {
      updateTaskState(task.id, { isLoading: true, isDryRunActive: isDryRun })
      
      const res = await fetch(task.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dryRun: isDryRun })
      })

      const result = await res.json()
      
      if (res.ok && result.success) {
        toast.success(isDryRun ? "점검 완료" : "실행 완료")
        
        updateTaskState(task.id, {
          lastResult: result.summary,
          lastRunAt: new Date().toISOString(),
          lastRunMode: isDryRun ? "dry-run" : "execution"
        })

        // 실제 리소스가 바뀌었으면 통계(Stats) 재갱신
        if (!isDryRun) {
          fetchStats()
          revalidateAdminSystemPath()
        }
      } else {
        toast.error(`실패: ${result.error || "알 수 없는 에러"}`)
      }
    } catch (error: any) {
      console.error(error)
      toast.error("통신 오류가 발생했습니다.")
    } finally {
      updateTaskState(task.id, { isLoading: false, isDryRunActive: false })
    }
  }

  return (
    <div className="space-y-6">
      {/* 글로벌 통계 요약 카드 */}
      <Card className="bg-primary/5 border-primary/20 shadow-sm">
        <CardContent className="p-4 flex flex-col md:flex-row gap-6 justify-between items-center">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-8 h-8 text-primary" />
            <div>
              <h3 className="font-bold text-lg">데이터베이스 건강 상태</h3>
              <p className="text-sm text-muted-foreground font-medium">유지보수 기준 지표를 확인합니다.</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center">
            <div className="bg-background rounded-md border px-4 py-2 flex flex-col items-center">
              <span className="text-xs text-muted-foreground font-semibold">활성 스트리머</span>
              {isStatsLoading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : <span className="font-bold text-lg">{stats?.totalActive || 0}</span>}
            </div>
            <div className="bg-background rounded-md border px-4 py-2 flex flex-col items-center">
              <span className="text-xs text-muted-foreground font-semibold">채널 ID 누락자 (백필 필요)</span>
              {isStatsLoading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : (
                <span className={`font-bold text-lg ${stats?.missingChannelId && stats.missingChannelId > 0 ? "text-amber-500" : "text-emerald-500"}`}>
                  {stats?.missingChannelId || 0}
                </span>
              )}
            </div>
            <div className="bg-background rounded-md border px-4 py-2 flex flex-col items-center min-w-[160px]">
              <span className="text-xs text-muted-foreground font-semibold">마지막 공식 업데이트</span>
              {isStatsLoading ? <Loader2 className="w-4 h-4 animate-spin mt-1" /> : (
                <span className="font-bold text-sm mt-1">
                  {stats?.lastVerifiedUpdateAt 
                    ? format(new Date(stats.lastVerifiedUpdateAt), "MM.dd HH:mm", { locale: ko }) 
                    : "기록 없음"
                  }
                </span>
              )}
            </div>
            <Button variant="outline" size="icon" onClick={fetchStats} disabled={isStatsLoading}>
               <Zap className={`w-4 h-4 ${isStatsLoading ? "animate-pulse delay-100" : ""}`} />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 태스크 작업 카드 목록 */}
      <div className="space-y-4">
        <h2 className="text-xl font-bold px-1">유지보수 액션</h2>
        {MAINTENANCE_TASKS.map(task => {
          const state = taskState[task.id] || { isLoading: false, isDryRunActive: false, lastResult: null, lastRunAt: null, lastRunMode: null }
          const Icon = task.icon

          return (
            <Card key={task.id} className="shadow-sm">
              <div className="flex flex-col md:flex-row shrink-0">
                {/* 좌측 정보 영역 */}
                <div className="p-5 md:w-[65%] border-b md:border-b-0 md:border-r flex flex-col justify-between">
                  <div className="space-y-2">
                    <h3 className="font-bold text-lg flex items-center gap-2">
                      <Icon className={`w-5 h-5 ${task.color}`} />
                      {task.title}
                    </h3>
                    <p className="text-sm text-muted-foreground leading-relaxed">
                      {task.description}
                    </p>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t flex gap-3">
                    <Button 
                      variant="outline" 
                      onClick={() => handleRunTask(task, true)}
                      disabled={state.isLoading}
                      className="font-semibold"
                    >
                      {state.isLoading && state.isDryRunActive ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Info className="w-4 h-4 mr-2 text-blue-500" />
                      )}
                      상태 점검 (Dry-run)
                    </Button>
                    <Button 
                      variant="default"
                      onClick={() => handleRunTask(task, false)}
                      disabled={state.isLoading}
                      className="font-semibold"
                    >
                      {state.isLoading && !state.isDryRunActive ? (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="w-4 h-4 mr-2" />
                      )}
                      실제 실행
                    </Button>
                  </div>
                </div>

                {/* 우측 결과 상태 뷰 */}
                <div className="flex-1 p-5 bg-muted/10 flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold flex items-center gap-1.5 opacity-80">
                      <FileJson className="w-4 h-4" />
                      최근 요약
                    </h4>
                    {state.lastRunAt && (
                      <Badge variant={state.lastRunMode === "dry-run" ? "secondary" : "default"} className="text-[10px] px-1.5 py-0">
                        {state.lastRunMode === "dry-run" ? "점검 (Dry-run)" : "실제 업데이트"}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="flex-1">
                    {state.lastResult ? (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(state.lastResult).map(([k, v]) => (
                            <div key={k} className="bg-background border rounded px-2 py-1 flex items-center justify-between text-xs">
                              <span className="text-muted-foreground truncate max-w-[80px]">{k}</span>
                              <span className="font-bold font-mono ml-2">{(v as any).toString()}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center h-full text-xs text-muted-foreground pb-4 pt-8">
                        저장된 요약 정보가 없습니다. 버튼을 눌러보세요.
                      </div>
                    )}
                  </div>

                  {state.lastRunAt && (
                    <div className="text-[10px] text-muted-foreground text-right mt-3">
                      실행 날짜: {format(new Date(state.lastRunAt), "yyyy.MM.dd HH:mm:ss", { locale: ko })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
