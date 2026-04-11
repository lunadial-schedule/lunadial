"use client";

import Link from "next/link";
import { toast } from "sonner";

// 이메일 복사 대상 주소
const CONTACT_EMAIL = "lunadialsys@gmail.com";

const NAV_LINKS = [
  { label: "이용약관", href: "/terms" },
  { label: "개인정보처리방침", href: "/privacy" },
  { label: "운영정책", href: "/policy" },
  { label: "업데이트 로그", href: "/updates" },
  { label: "공지사항", href: "/notices" },
] as const;

async function copyEmail() {
  try {
    await navigator.clipboard.writeText(CONTACT_EMAIL);
    toast.success("이메일 주소가 복사되었습니다.");
  } catch {
    toast.error("이메일 복사에 실패했습니다.");
  }
}

export function SiteFooter() {
  return (
    <footer
      className="border-t bg-background text-muted-foreground"
      role="contentinfo"
    >
      <div className="mx-auto max-w-screen-xl px-4 py-8 sm:px-6 lg:px-8">
        {/* PC: 좌우 레이아웃 / 모바일: 세로 스택 */}
        <div className="flex flex-col items-center gap-4 md:flex-row md:items-start md:justify-between">
          {/* 좌측: 서비스 정보 */}
          <div className="flex flex-col items-center gap-1 md:items-start">
            <span className="flex items-baseline gap-1.5">
              <span className="text-base font-semibold text-foreground">LUNA DIAL</span>
              <span className="text-xs text-zinc-500 dark:text-zinc-400">0.1.0 Beta</span>
            </span>
            <span className="text-xs flex flex-wrap gap-x-1 items-center">
              Built with{" "}
              <a href="https://nextjs.org/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">Next.js</a>
              {" · "}
              <a href="https://react.dev/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">React</a>
              {" · "}
              <a href="https://tailwindcss.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">Tailwind CSS</a>
              {" · "}
              <a href="https://ui.shadcn.com/" target="_blank" rel="noopener noreferrer" className="hover:text-foreground transition-colors underline-offset-2 hover:underline">shadcn/ui</a>
            </span>
          </div>

          {/* 우측: 네비게이션 링크 */}
          <nav aria-label="Footer 링크">
            <ul className="flex flex-wrap justify-center gap-x-4 gap-y-2 text-sm md:justify-end">
              {/* 이메일 복사 버튼 */}
              <li>
                <button
                  type="button"
                  onClick={copyEmail}
                  className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                  aria-label="이메일 주소 클립보드 복사"
                >
                  이메일
                </button>
              </li>
              {NAV_LINKS.map(({ label, href }) => (
                <li key={href}>
                  <Link
                    href={href}
                    className="transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 rounded"
                  >
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        {/*
         * [선택 구현] 비공식 서비스 고지 (치지직 연동 시 주석 해제)
         * Lunadial은 NAVER Chzzk의 공식 서비스가 아니며, NAVER Corp의 승인 또는 보증을 받지 않았습니다.
         */}

        {/* 저작권 및 기타 고지 */}
        <div className="mt-6 flex flex-col md:flex-row items-center md:items-start justify-between text-xs md:text-left gap-4">
          <p>
            © 2026 LUNA DIAL. All rights reserved.
          </p>
          <p className="text-muted-foreground/60 text-center md:text-right max-w-sm">
            이 페이지에는 제휴 마케팅이 포함되어 있으며, 이에 따른 일정액의 수수료를 제공받을 수 있습니다.
          </p>
        </div>
      </div>
    </footer>
  );
}
