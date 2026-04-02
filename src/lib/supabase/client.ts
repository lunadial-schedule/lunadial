/**
 * 🔒 Supabase 브라우저 클라이언트
 *
 * [역할 및 주의사항]
 * - 클라이언트 컴포넌트("use client")에서 브라우저 전용으로 Supabase에 접근할 때 사용합니다.
 * - 로그인, 세션 유지, RLS(Row Level Security) 정책의 영향을 받습니다.
 * 
 * ⚠️ 주의: 서버 환경(Server Actions, API Route, Server Component)에서는 동작하지 않거나 
 * 세션 꼬임 문제가 발생할 수 있으므로 절대 호환해서 쓰지 마세요.
 * 서버 환경에서는 반드시 `lib/supabase/server.ts`의 createClient를 사용해야 합니다.
 */
import { createBrowserClient } from '@supabase/ssr'

/** 브라우저용 Supabase 클라이언트 인스턴스를 생성한다. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!
  )
}
