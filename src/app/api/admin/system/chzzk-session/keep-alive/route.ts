import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { refreshChzzkToken, getChzzkProfile } from "@/lib/server/chzzk"
import { decryptString, encryptString } from "@/lib/server/crypto"

export const dynamic = "force-dynamic"

/**
 * 치지직 Keep-alive 실행 API
 * 관리자 전용이며, 연동된 계정의 토큰을 갱신하고 유저 정보를 조회하여 API 사용 기록을 남깁니다.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    
    // 1. 관리자 권한 확인
    const { data: { user }, error: userError } = await supabase.auth.getUser()
    if (!user || userError) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: roleData } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .maybeSingle()

    if (roleData?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    // 2. 연동된 치지직 계정 하나 가져오기 (가장 최근 업데이트된 것 우선)
    const { data: account, error: accountError } = await supabase
      .from("connected_accounts")
      .select("*")
      .eq("provider", "chzzk")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle()

    if (!account || accountError) {
      return NextResponse.json({ 
        error: "No connected Chzzk account found. Please link an account first.",
        details: accountError
      }, { status: 404 })
    }

    const logData: any = {
      executed_by: user.id,
      target_user_id: account.user_id,
      status: "failure",
      token_refreshed: false,
      profile_fetched: false
    }

    try {
      // 3. 리프레시 토큰 복호화
      if (!account.refresh_token_encrypted) {
        throw new Error("No refresh token found for this account")
      }
      
      let refreshToken = ""
      try {
        refreshToken = decryptString(account.refresh_token_encrypted)
      } catch (decryptErr: any) {
        console.error("복호화 실패:", decryptErr)
        throw new Error("복호화 실패: 기존 키 생성 규칙과 불일치할 수 있습니다. 치지직 계정 재연동이 필요합니다.")
      }

      // 4. 토큰 갱신
      let newTokenData: any
      try {
        newTokenData = await refreshChzzkToken(refreshToken)
        logData.token_refreshed = true
      } catch (refreshErr: any) {
        console.error("토큰 갱신 실패:", refreshErr)
        throw new Error(`토큰 갱신 실패: ${refreshErr.message || "Refresh Token이 만료되었을 수 있습니다."}`)
      }

      // 5. 서버 측 업데이트를 위한 토큰 암호화
      const encryptedAccessToken = encryptString(newTokenData.accessToken)
      const encryptedRefreshToken = encryptString(newTokenData.refreshToken)
      
      let tokenExpiresAt = null
      if (newTokenData.expiresIn) {
        tokenExpiresAt = new Date(Date.now() + newTokenData.expiresIn * 1000).toISOString()
      }

      // DB 업데이트
      const { error: updateError } = await supabase
        .from("connected_accounts")
        .update({
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString()
        })
        .eq("id", account.id)

      if (updateError) throw updateError

      // 6. 유저 프로필 조회 (실제 API 사용 실적 발생)
      try {
        const profile = await getChzzkProfile(newTokenData.accessToken)
        logData.profile_fetched = true
        logData.target_channel_id = profile.channelId
        logData.target_channel_name = profile.channelName
        logData.status = "success"

        // 7. 로그 저장 (성공)
        const { error: logInsertError } = await supabase.from("chzzk_keep_alive_logs").insert(logData)
        if (logInsertError) {
          console.error("Keep-alive 성공 로그 INSERT 실패 (RLS 정책 누락 가능성):", logInsertError)
        }

        return NextResponse.json({
          success: true,
          message: "Chzzk keep-alive executed successfully",
          data: {
            channelName: profile.channelName,
            executedAt: new Date().toISOString(),
            logSaved: !logInsertError
          }
        })
      } catch (profileErr: any) {
        console.error("프로필 조회 실패:", profileErr)
        throw new Error(`프로필 조회 실패: API 호출 권한 또는 서비스 상태를 확인하세요. (${profileErr.message})`)
      }

    } catch (err: any) {
      console.error("Keep-alive detail error:", err.message)
      logData.error_message = err.message || "Unknown error"
      
      // 로그 저장 (실패 시에도)
      const { error: logInsertError } = await supabase.from("chzzk_keep_alive_logs").insert(logData)
      if (logInsertError) {
        console.error("Keep-alive 실패 로그 INSERT 실패 (RLS 정책 누락 가능성):", logInsertError)
      }

      // 명시적인 재연동 필요 여부 판단
      const needsReconnect = 
        err.message.includes("복호화 실패") || 
        err.message.includes("refresh_token") || 
        err.message.includes("invalid_grant") ||
        err.message.includes("401")

      return NextResponse.json({
        success: false,
        error: logData.error_message,
        needs_reconnect: needsReconnect
      }, { status: 500 })
    }

  } catch (error: any) {
    console.error("Keep-alive top-level error:", error)
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 })
  }
}
