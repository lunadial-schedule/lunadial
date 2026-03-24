import { getNotices, deleteNotice } from "@/app/actions/notices";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Pin, AlertCircle, Plus } from "lucide-react";

export const revalidate = 0; // Admin pages should be dynamic

export default async function AdminNoticesPage() {
  const { data: notices, error } = await getNotices(false); // Fetch all including unpublished

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">공지사항 관리</h1>
        <Link 
          href="/admin/notices/create" 
          className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
        >
          <Plus className="mr-2 h-4 w-4" />
          새 공지 작성
        </Link>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          목록을 불러오는 중 오류가 발생했습니다.
        </div>
      ) : notices?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
          작성된 공지사항이 아직 없어요.
        </div>
      ) : (
        <div className="rounded-md border bg-card">
          <div className="w-full overflow-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-muted border-b">
                <tr>
                  <th className="px-4 py-3 font-medium text-foreground">상태/배지</th>
                  <th className="px-4 py-3 font-medium text-foreground">제목</th>
                  <th className="px-4 py-3 font-medium text-foreground">작성자</th>
                  <th className="px-4 py-3 font-medium text-foreground">작성일</th>
                  <th className="px-4 py-3 font-medium text-foreground text-right">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y text-muted-foreground">
                {notices?.map((notice) => (
                  <tr key={notice.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {notice.is_published ? (
                          <Badge variant="outline" className="text-emerald-500 border-emerald-200 bg-emerald-50">게시중</Badge>
                        ) : (
                          <Badge variant="secondary">임시저장</Badge>
                        )}
                        {notice.is_pinned && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20"><Pin className="w-3 h-3" /></Badge>}
                        {notice.is_important && <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3" /></Badge>}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground max-w-[200px] truncate">{notice.title}</td>
                    <td className="px-4 py-3">{notice.author_nickname}</td>
                    <td className="px-4 py-3">{format(new Date(notice.created_at), "yyyy-MM-dd", { locale: ko })}</td>
                    <td className="px-4 py-3 text-right">
                      <Link 
                        href={`/admin/notices/${notice.id}/edit`}
                        className="text-primary hover:underline"
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
