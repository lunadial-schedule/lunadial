import { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = {
  title: "관리자 설정 - LUNA DIAL",
  description: "LUNA DIAL 관리자 전용 페이지입니다.",
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8 min-h-[calc(100vh-4rem)] flex flex-col md:flex-row gap-8">
      {/* Sidebar */}
      <aside className="w-full md:w-64 flex flex-col gap-6 shrink-0">
        <div className="flex items-center gap-2 px-2 text-primary font-bold text-lg">
          <ShieldAlert className="w-5 h-5" />
          <span>관리자 대시보드</span>
        </div>
        <nav className="flex flex-col gap-1">
          <Link href="/admin/notices" className="px-4 py-2 rounded-md hover:bg-muted font-medium transition-colors text-sm text-foreground">
            공지사항 관리
          </Link>
          <Link href="/admin/system/chzzk-session" className="px-4 py-2 rounded-md hover:bg-muted font-medium transition-colors text-sm text-foreground">
            치지직 연동 관리
          </Link>
          <Link href="/admin/logs" className="px-4 py-2 rounded-md hover:bg-muted font-medium transition-colors text-sm text-foreground">
            업데이트 로그 열람
          </Link>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        {children}
      </main>
    </div>
  );
}
