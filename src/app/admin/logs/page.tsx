/**
 * 관리자 페이지 - 업데이트 로그 열람
 * 
 * @param searchParams 검색 파라미터
 * @returns 업데이트 로그 페이지
 */

import { getScheduleUpdateLogs } from "@/app/actions/logs";
import { UpdateLogList } from "@/components/updates/log-list";
import { PaginationControls } from "@/components/updates/pagination-controls";

export const revalidate = 0; // Admin pages should be dynamic

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function AdminLogsPage({ searchParams }: Props) {
  const resolvedParams = await searchParams;
  const pageParam = resolvedParams.page;

  let page = 1;
  if (typeof pageParam === "string") {
    const parsed = parseInt(pageParam, 10);
    if (!isNaN(parsed) && parsed > 0) page = parsed;
  }

  const action = typeof resolvedParams.action === "string" ? resolvedParams.action : "all";
  const method = typeof resolvedParams.method === "string" ? resolvedParams.method : "all";

  const { data: logs, totalPages, error } = await getScheduleUpdateLogs({
    page,
    limit: 20,
    actionType: action,
    inputMethod: method,
    fetchAdminData: true,
  });

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
          {totalPages > 1 && (
            <PaginationControls currentPage={page} totalPages={totalPages} />
          )}
        </div>
      )}
    </div>
  );
}
