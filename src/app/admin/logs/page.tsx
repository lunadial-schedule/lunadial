import { getScheduleUpdateLogs } from "@/app/actions/logs";
import { UpdateLogList } from "@/components/updates/log-list";

export const revalidate = 0; // Admin pages should be dynamic

export default async function AdminLogsPage() {
  const { data: logs, error } = await getScheduleUpdateLogs(100, true); // fetchAdminData = true

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">업데이트 로그 열람</h1>
        <p className="text-sm text-muted-foreground">일반 사용자에게 보이지 않는 상세 데이터와 접속 IP가 포함된 전체 로그를 확인합니다.</p>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          로그를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <div className="bg-card rounded-xl border p-4 shadow-sm">
          <UpdateLogList initialLogs={logs || []} isAdminView={true} />
        </div>
      )}
    </div>
  );
}
