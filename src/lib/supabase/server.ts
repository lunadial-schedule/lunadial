/**
 * 🔒 Supabase 서버 클라이언트
 *
 * [역할 및 주의사항]
 * - 서버 컴포넌트, Server Action, API Route 내부 등 서버 환경에서 Supabase에 접근할 때 사용합니다.
 * - Next.js의 cookies()를 기반으로 현재 요청(Request) 대상 사용자의 세션을 자동으로 식별합니다.
 * - RLS(Row Level Security) 제약을 정상적으로 받으므로, 로그인한 사용자의 권한 내에서만 DB 접근이 허용됩니다.
 * 
 * ⚠️ 주의: RLS를 무시하고 강제로 백그라운드 작업을 해야 하는 경우라면 이 파일이 아니라 
 * `lib/supabase/admin.ts`의 createAdminClient를 제한적으로 사용하세요.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** 서버용 Supabase 클라이언트 인스턴스를 생성한다. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    (process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component에서 호출 시 쿠키 설정이 불가능할 수 있다.
            // 미들웨어에서 세션을 갱신하므로 무시해도 안전하다.
          }
        },
      },
    }
  )
}
