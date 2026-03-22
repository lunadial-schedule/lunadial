/**
 * Supabase 브라우저 클라이언트 생성
 *
 * 클라이언트 컴포넌트("use client")에서 Supabase에 접근할 때 사용한다.
 * 서버 컴포넌트/액션에서는 lib/supabase/server.ts의 createClient를 사용한다.
 */
import { createBrowserClient } from '@supabase/ssr'

/** 브라우저용 Supabase 클라이언트 인스턴스를 생성한다. */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!
  )
}
