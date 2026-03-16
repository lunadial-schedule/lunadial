/**
 * 로그아웃 라우트
 *
 * Supabase 세션을 종료하고 메인 페이지(/)로 리다이렉트한다.
 */
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.redirect(new URL('/', request.url), {
    status: 302,
  })
}
