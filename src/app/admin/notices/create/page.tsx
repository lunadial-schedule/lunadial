import { createNotice } from "@/app/actions/notices";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CreateNoticePage() {
  async function onSubmit(formData: FormData) {
    "use server";
    
    const title = formData.get("title") as string;
    const content = formData.get("content") as string;
    const is_published = formData.get("is_published") === "on";
    const is_pinned = formData.get("is_pinned") === "on";
    const is_important = formData.get("is_important") === "on";

    if (!title || !content) return; // Basic validation

    const { error } = await createNotice({
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/admin/notices" className="text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">새 공지 작성</h1>
      </div>

      <form action={onSubmit} className="space-y-6 bg-card p-6 rounded-xl border shadow-sm">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium">제목 *</label>
          <input 
            type="text" 
            id="title" 
            name="title" 
            required 
            placeholder="공지사항 제목을 입력하세요"
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
            placeholder="마크다운 형식으로 내용을 입력하세요"
            className="flex min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          />
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-6 p-4 bg-muted/50 rounded-lg border">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_published" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
            <span className="text-sm font-medium">즉시 게시</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_pinned" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
            <span className="text-sm font-medium w-max text-primary">목록 상단 고정</span>
          </label>
          
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" name="is_important" className="rounded border-gray-300 text-primary focus:ring-primary w-4 h-4" />
            <span className="text-sm font-medium w-max text-destructive">중요 표시</span>
          </label>
        </div>

        <div className="flex justify-end gap-4 pt-4 border-t">
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
      </form>
    </div>
  );
}
