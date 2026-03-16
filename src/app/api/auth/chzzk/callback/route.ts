/**
 * 치지직 OAuth 콜백 처리
 *
 * 치지직 계정 연동 후 리다이렉트되는 엔드포인트.
 * 처리 흐름:
 * 1. state 검증 (CSRF 방지)
 * 2. 인증 코드로 토큰 교환
 * 3. 사용자 프로필(채널 ID/이름) 조회
 * 4. 토큰 암호화 후 connected_accounts 테이블에 upsert
 * 5. 설정 페이지로 리다이렉트 (성공/실패)
 */
import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authorizeChzzkToken, getChzzkProfile } from "@/lib/server/chzzk"
import { verifyChzzkState } from "@/lib/server/chzzk-oauth"
import { encryptString } from "@/lib/server/crypto"

/** 캐싱 방지 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const errorRedirectUrl = new URL(`${appUrl}/settings/account?chzzk_error=true`)
  const successRedirectUrl = new URL(`${appUrl}/settings/account?chzzk_success=true`)

  // 사용자가 동의를 취소했거나 치지직 오류 발생
  if (error || !code || !state) {
    return NextResponse.redirect(new URL(`${appUrl}/settings/account?chzzk_error=canceled`))
  }

  try {
    const supabase = await createClient()
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    
    if (!user || userError) {
      errorRedirectUrl.searchParams.set("chzzk_error", "unauthorized")
      return NextResponse.redirect(errorRedirectUrl)
    }

    // 1. state 검증 (CSRF 방지)
    const isValidState = await verifyChzzkState(state)
    if (!isValidState) {
      errorRedirectUrl.searchParams.set("chzzk_error", "invalid_state")
      return NextResponse.redirect(errorRedirectUrl)
    }

    // 2. 인증 코드 → 토큰 교환
    const tokenData = await authorizeChzzkToken(code, state)
    // 3. 사용자 프로필 조회
    const profileData = await getChzzkProfile(tokenData.accessToken)

    // 토큰 만료 시각 계산
    let tokenExpiresAt = null;
    if (tokenData.expiresIn) {
      tokenExpiresAt = new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
    }

    // 4. 토큰 암호화
    const encryptedAccessToken = encryptString(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken ? encryptString(tokenData.refreshToken) : null

    // 5. DB upsert (provider + provider_user_id 기준)
    const { error: dbError } = await supabase
      .from("connected_accounts")
      .upsert({
        user_id: user.id,
        provider: "chzzk",
        provider_user_id: profileData.channelId,
        provider_username: profileData.channelName,
        access_token_encrypted: encryptedAccessToken,
        refresh_token_encrypted: encryptedRefreshToken,
        token_expires_at: tokenExpiresAt,
        updated_at: new Date().toISOString()
      }, {
        onConflict: "provider, provider_user_id"
      })

    if (dbError) {
      console.error("연동 정보 저장 에러:", dbError)
      if (dbError.code === "23505") { // 유니크 제약 위반 — 다른 계정이 이미 연동
        errorRedirectUrl.searchParams.set("chzzk_error", "already_linked")
      } else {
        errorRedirectUrl.searchParams.set("chzzk_error", "db_error")
      }
      return NextResponse.redirect(errorRedirectUrl)
    }

    return NextResponse.redirect(successRedirectUrl)
  } catch (err: any) {
    console.error("치지직 콜백 에러:", err.message || err)
    errorRedirectUrl.searchParams.set("chzzk_error", "server_error")
    errorRedirectUrl.searchParams.set("details", err.message || "unknown")
    return NextResponse.redirect(errorRedirectUrl)
  }
}
