import { getNotices } from "@/app/actions/notices";
import type { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Pin, AlertCircle, ChevronRight } from "lucide-react";

export const metadata: Metadata = {
  title: "공지사항 - LUNA DIAL",
  description: "LUNA DIAL 서비스 공지사항입니다.",
};

export const revalidate = 60;

export default async function NoticesPage() {
  const { data: notices, error } = await getNotices(true); // only published

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">공지사항</h1>
        <p className="mt-2 text-muted-foreground">서비스 점검, 업데이트 등 새로운 소식을 알려드려요.</p>
      </div>

      {error ? (
        <div className="rounded-lg bg-destructive/10 p-4 text-destructive text-sm">
          공지사항을 불러오는 중 오류가 발생했습니다.
        </div>
      ) : notices?.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border rounded-lg border-dashed">
          등록된 공지사항이 아직 없어요.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notices?.map((notice) => (
            <Link 
              key={notice.id} 
              href={`/notices/${notice.id}`}
              className={`group flex flex-col gap-2 p-4 rounded-lg border bg-card transition-all hover:border-primary/50 hover:bg-muted/30 ${notice.is_pinned ? 'border-primary/20 bg-primary/5' : ''}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex flex-col gap-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {notice.is_pinned && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20"><Pin className="w-3 h-3 mr-1" /> 고정</Badge>}
                    {notice.is_important && <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" /> 중요</Badge>}
                    <span className={`font-medium ${notice.is_pinned ? 'text-primary' : 'text-foreground'}`}>{notice.title}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{notice.author_nickname}</span>
                    <span>•</span>
                    <time dateTime={notice.published_at || notice.created_at}>
                      {format(new Date(notice.published_at || notice.created_at), "yyyy-MM-dd", { locale: ko })}
                    </time>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-muted-foreground/50 group-hover:text-primary transition-colors flex-shrink-0 mt-1" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
