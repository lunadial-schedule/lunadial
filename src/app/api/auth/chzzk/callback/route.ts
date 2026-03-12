import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { authorizeChzzkToken, getChzzkProfile } from "@/lib/server/chzzk"
import { verifyChzzkState } from "@/lib/server/chzzk-oauth"
import { encryptString } from "@/lib/server/crypto"

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const code = searchParams.get("code")
  const state = searchParams.get("state")
  const error = searchParams.get("error")

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin
  const errorRedirectUrl = new URL(`${appUrl}/settings/account?chzzk_error=true`)
  const successRedirectUrl = new URL(`${appUrl}/settings/account?chzzk_success=true`)

  // 동의 취소 또는 치지직 오류
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

    const isValidState = await verifyChzzkState(state)
    if (!isValidState) {
      errorRedirectUrl.searchParams.set("chzzk_error", "invalid_state")
      return NextResponse.redirect(errorRedirectUrl)
    }

    // 토큰 발급
    const tokenData = await authorizeChzzkToken(code, state)
    // 사용자 식별정보 조회
    const profileData = await getChzzkProfile(tokenData.accessToken)

    let tokenExpiresAt = null;
    if (tokenData.expiresIn) {
      // expiresIn (seconds) -> timestamp
      tokenExpiresAt = new Date(Date.now() + tokenData.expiresIn * 1000).toISOString()
    }

    const encryptedAccessToken = encryptString(tokenData.accessToken)
    const encryptedRefreshToken = tokenData.refreshToken ? encryptString(tokenData.refreshToken) : null

    // DB 저장 (upsert)
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
      console.error("Supabase upsert error:", dbError)
      // 이미 다른 유저가 이 채널을 연동했다면 에러가 날 수 있음 (UNIQUE 제약 위반 등)
      if (dbError.code === "23505") { // unique_violation
        errorRedirectUrl.searchParams.set("chzzk_error", "already_linked")
      } else {
        errorRedirectUrl.searchParams.set("chzzk_error", "db_error")
      }
      return NextResponse.redirect(errorRedirectUrl)
    }

    return NextResponse.redirect(successRedirectUrl)
  } catch (err: any) {
    console.error("Chzzk callback catch error:", err)
    errorRedirectUrl.searchParams.set("chzzk_error", "server_error")
    return NextResponse.redirect(errorRedirectUrl)
  }
}
