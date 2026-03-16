/**
 * Next.js 미들웨어
 *
 * 매 요청마다 Supabase 인증 세션을 갱신한다.
 * 정적 파일, 이미지 최적화, favicon 경로는 제외한다.
 */
import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  return await updateSession(request)
}

/** 미들웨어를 적용할 경로 매처 (정적 파일 제외) */
export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
