/**
 * Supabase 미들웨어 세션 갱신
 *
 * Next.js 미들웨어에서 매 요청마다 호출되어 Supabase 인증 토큰을 자동 갱신한다.
 * 쿠키를 통해 세션을 주고받으며, 만료된 토큰을 투명하게 리프레시한다.
 */
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * 요청의 Supabase 세션을 갱신하고 응답 쿠키를 업데이트한다.
 * middleware.ts에서 직접 호출한다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // 인증 토큰 갱신 (만료 시 자동 리프레시)
  await supabase.auth.getUser()

  return supabaseResponse
}
