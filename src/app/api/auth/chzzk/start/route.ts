/**
 * 치지직 OAuth 시작
 *
 * 인증된 사용자를 치지직 계정 연동 페이지로 리다이렉트한다.
 */
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { getChzzkOAuthUrl } from "@/lib/server/chzzk-oauth"

/** 캐싱 방지 */
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 })
  }

  try {
    const authUrl = await getChzzkOAuthUrl()
    return NextResponse.redirect(authUrl)
  } catch (error: any) {
    console.error("치지직 OAuth 시작 실패:", error)
    return NextResponse.json({ error: "치지직 연동 초기화 실패" }, { status: 500 })
  }
}
