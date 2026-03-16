/**
 * Supabase 서버 클라이언트 생성
 *
 * 서버 컴포넌트, Server Action, API Route에서 Supabase에 접근할 때 사용한다.
 * 쿠키 기반으로 현재 사용자의 세션을 자동으로 읽는다.
 */
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/** 서버용 Supabase 클라이언트 인스턴스를 생성한다. */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
