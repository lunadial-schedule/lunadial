import { getNoticeById } from "@/app/actions/notices";
import { Metadata } from "next";
import Link from "next/link";
import { format } from "date-fns";
import { ko } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Pin, AlertCircle, ArrowLeft } from "lucide-react";
import ReactMarkdown from "react-markdown";

export const revalidate = 60;

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params;
  const { data: notice } = await getNoticeById(params.id);
  if (!notice) return { title: "공지사항 없음 - LUNA DIAL" };
  return { title: `${notice.title} - LUNA DIAL` };
}

export default async function NoticeDetailPage(props: Props) {
  const params = await props.params;
  const { data: notice, error } = await getNoticeById(params.id);

  if (error || !notice) {
    return (
      <main className="mx-auto max-w-screen-md px-4 py-16 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
        <div className="text-center">
          <h1 className="text-2xl font-bold tracking-tight text-foreground">공지사항을 찾을 수 없습니다.</h1>
          <p className="mt-4 text-muted-foreground">삭제되었거나 존재하지 않는 공지사항입니다.</p>
          <div className="mt-8">
            <Link href="/notices" className="text-sm font-medium text-primary hover:underline">
              목록으로 돌아가기
            </Link>
          </div>
        </div>
      </main>
    );
  }

  // Publish check for normal users: they should only see published notices.
  // We assume RLS or getNoticeById allows fetching, but let's be safe:
  // (In our SQL, we didn't restrict single-row by is_published if RLS doesn't catch it, wait - RLS does catch it for non-admins).

  return (
    <main className="mx-auto max-w-screen-md px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)]">
      <div className="mb-6">
        <Link href="/notices" className="inline-flex items-center text-sm font-medium text-muted-foreground hover:text-foreground transition-colors group">
          <ArrowLeft className="mr-2 h-4 w-4 transition-transform group-hover:-translate-x-1" />
          목록으로
        </Link>
      </div>

      <article className="border border-border/50 bg-card rounded-xl overflow-hidden">
        <header className="p-6 sm:p-8 bg-muted/20 border-b border-border/50">
          <div className="flex flex-wrap gap-2 mb-3">
            {notice.is_pinned && <Badge variant="secondary" className="bg-primary/10 text-primary border-primary/20"><Pin className="w-3 h-3 mr-1" /> 고정</Badge>}
            {notice.is_important && <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20"><AlertCircle className="w-3 h-3 mr-1" /> 중요</Badge>}
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground break-keep leading-tight mb-4">
            {notice.title}
          </h1>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{notice.author_nickname}</span>
            <div className="flex items-center gap-2">
              <time dateTime={notice.published_at || notice.created_at}>
                {format(new Date(notice.published_at || notice.created_at), "yyyy년 MM월 dd일 HH:mm", { locale: ko })}
              </time>
              {notice.updated_at !== notice.created_at && (
                <span className="text-xs opacity-70">(수정됨)</span>
              )}
            </div>
          </div>
        </header>

        <div className="p-6 sm:p-8 min-h-[200px] prose prose-zinc dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-muted/50 prose-pre:border prose-pre:border-border/50 prose-a:text-primary">
          <ReactMarkdown>
            {notice.content}
          </ReactMarkdown>
        </div>
      </article>
    </main>
  );
}
