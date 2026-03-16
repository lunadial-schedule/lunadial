/**
 * Supabase Auth 콜백 라우트
 *
 * Google OAuth 등 소셜 로그인 후 리다이렉트되는 엔드포인트.
 * 인증 코드를 세션으로 교환하고, 지정된 페이지(기본: /)로 리다이렉트한다.
 */
import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      return NextResponse.redirect(new URL(next, requestUrl.origin))
    }
  }

  // 인증 실패 시 로그인 페이지로 리다이렉트
  return NextResponse.redirect(new URL('/login?error=Invalid+login+link', requestUrl.origin))
}
