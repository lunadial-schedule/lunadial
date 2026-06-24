import { PageContainer } from "@/components/layout/page-container"
import { MaintenanceDashboard } from "@/components/admin/system/maintenance-dashboard"
import { ShieldAlert } from "lucide-react"

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
        </div>
      </div>
    </PageContainer>
  )
}
