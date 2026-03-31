/**
 * 업데이트 로그 페이지
 * 
 * @param searchParams 검색 파라미터
 * @returns 업데이트 로그 페이지
 */

import { getScheduleUpdateLogs } from "@/app/actions/logs";
import { UpdateLogList } from "@/components/updates/log-list";
import { PaginationControls } from "@/components/updates/pagination-controls";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "업데이트 로그 - LUNA DIAL",
  description: "최근 추가·수정·삭제된 일정 내역",
};

export const revalidate = 60; // 1 min ISR for updates

type Props = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

export default async function UpdatesPage({ searchParams }: Props) {
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
    fetchAdminData: false,
  });

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">업데이트 로그</h1>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          로그를 불러오는 중 오류가 발생했습니다.
        </div>
      ) : (
        <>
          <UpdateLogList initialLogs={logs || []} />
          {totalPages > 1 && (
            <PaginationControls currentPage={page} totalPages={totalPages} />
          )}
        </>
      )}
    </main>
  );
}
