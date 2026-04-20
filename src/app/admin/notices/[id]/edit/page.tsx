import { getNoticeById, updateNotice, deleteNotice } from "@/app/actions/notices";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Trash2 } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "공지 수정 - 관리자 대시보드",
};

export default async function EditNoticePage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const { data: notice } = await getNoticeById(params.id);

  if (!notice) {
    redirect("/admin/notices");
  }

  async function onUpdate(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const is_published = formData.get("is_published") === "on";
    const is_pinned = formData.get("is_pinned") === "on";
    const is_important = formData.get("is_important") === "on";

    if (!title || !content) return;

    const { error } = await updateNotice(params.id, {
      title,
      content,
      is_published,
      is_pinned,
      is_important
    });

    if (!error) {
      redirect("/admin/notices");
    }
  }

  async function onDelete() {
    "use server";
    const { error } = await deleteNotice(params.id);
    if (!error) {
      redirect("/admin/notices");
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/notices" className="text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">공지 수정</h1>
        </div>
        <form action={onDelete}>
          <button 
            type="submit"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 text-destructive hover:bg-destructive/10 h-10 px-4 py-2"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            삭제
          </button>
        </form>
      </div>

      <form action={onUpdate} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">제목 *</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            required 
            defaultValue={notice.title}
            className="flex h-10 w-full rounded-md border border-input bg-background py-2 px-3 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="content" className="text-sm font-medium">내용 (Markdown) *</label>
          <textarea 
            id="content" 
            name="content" 
            required 
            rows={10}
            defaultValue={notice.content}
            className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-muted/50 rounded-lg border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_published" defaultChecked={notice.is_published} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
            <span className="text-sm font-medium">즉시 게시</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_pinned" defaultChecked={notice.is_pinned} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
            <span className="text-sm font-medium w-max text-primary">목록 상단 고정</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_important" defaultChecked={notice.is_important} className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
            <span className="text-sm font-medium w-max text-destructive">중요 표시</span>
          </label>
        </div>

        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-xs text-muted-foreground">
            작성자: {notice.author_nickname}
          </div>
          <div className="flex justify-end gap-3">
            <Link 
              href="/admin/notices" 
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
            >
              취소
            </Link>
            <button 
              type="submit"
              className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
            >
              저장
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
