import { PageContainer } from "@/components/layout/page-container"
import { ChzzkKeepAliveCard } from "@/components/admin/system/chzzk-keep-alive-card"
import { MaintenanceDashboard } from "@/components/admin/system/maintenance-dashboard"
import { ShieldAlert, Info } from "lucide-react"

export default function AdminChzzkPage() {
  return (
    <PageContainer className="py-2">
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-3 text-foreground">
            <ShieldAlert className="w-8 h-8 text-[#00FFA3]" />
            치지직 시스템 관리
          </h1>
          <p className="text-muted-foreground font-medium">
            치지직 Open API 유지보수, 채널 갱신 및 연동 상태를 관리합니다.
          </p>
        </div>

        <div className="grid gap-6">
          <MaintenanceDashboard />
          <ChzzkKeepAliveCard />
          
          <div className="p-5 border rounded-xl bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-300">
            <div className="flex items-start gap-3">
              <Info className="w-5 h-5 mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-lg mb-1.5">치지직 API 정책 안내</h3>
                <ul className="text-sm space-y-2 font-medium opacity-90 list-disc ml-4">
                  <li>최근 90일간 API 사용 실적(Scope 호출)이 없는 애플리케이션은 <b>치지직 개발자 센터에서 자동으로 삭제</b>됩니다.</li>
                  <li>본 유지보수 기능 및 Keep-alive를 실행하면 저장된 계정으로 API가 호출되어 실적을 발생시킵니다.</li>
                  <li><b>안전한 운영을 위해 주기적으로 수동 점검 및 실행</b>을 권장합니다.</li>
                  <li>만약 앱이 삭제되면 모든 사용자의 기존 연동 데이터가 무효화되므로 주의가 필요합니다.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageContainer>
  )
}
