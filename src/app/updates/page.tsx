import { getScheduleUpdateLogs } from "@/app/actions/logs";
import { UpdateLogList } from "@/components/updates/log-list";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "업데이트 로그 - LUNA DIAL",
  description: "최근 추가·수정·삭제된 일정 내역",
};

export const revalidate = 60; // 1 min ISR for updates

export default async function UpdatesPage() {
  const { data: logs, error } = await getScheduleUpdateLogs(100);

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
        <UpdateLogList initialLogs={logs || []} />
      )}
    </main>
  );
}
