import { NextResponse } from "next/server"
import { assertAdminOpsAuthorized } from "@/lib/admin-auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { CHZZK_CLIENT_ID, CHZZK_CLIENT_SECRET, CHZZK_OPENAPI_BASE_URL } from "@/config/env"
import { refreshChzzkToken, getChzzkProfile } from "@/lib/server/chzzk"
import { decryptString, encryptString } from "@/lib/server/crypto"

export const dynamic = "force-dynamic"

interface EndpointPingResult {
  endpoint: string
  ok: boolean
  status: number
  error?: string
}

async function pingClientEndpoint(pathWithQuery: string): Promise<EndpointPingResult> {
  try {
    const res = await fetch(`${CHZZK_OPENAPI_BASE_URL}${pathWithQuery}`, {
      method: "GET",
      headers: {
        "Client-Id": CHZZK_CLIENT_ID,
        "Client-Secret": CHZZK_CLIENT_SECRET,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    })
    return {
      endpoint: pathWithQuery,
      ok: res.ok,
      status: res.status,
      ...(res.ok ? {} : { error: await res.text().catch(() => res.statusText) }),
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Network error"
    return {
      endpoint: pathWithQuery,
      ok: false,
      status: 0,
      error: message,
    }
  }
}

/**
 * 치지직 Open API Keep-Alive 엔드포인트
 *
 * 최근 90일(3개월)간 API 사용 이력이 없어 치지직 개발자 센터 애플리케이션이
 * 자동 삭제되는 것을 방지하기 위해 주기적으로 호출된다.
 *
 * 1) Client 인증 기반 Open API(/open/v1/lives, /open/v1/categories/search, /open/v1/channels) 호출
 * 2) 연동된 치지직 OAuth 계정이 있는 경우 토큰 갱신 + /open/v1/users/me(유저 정보 조회 Scope) 호출
 */
export async function POST(req: Request) {
  const authError = await assertAdminOpsAuthorized(req)
  if (authError) return authError

  if (!CHZZK_CLIENT_ID || !CHZZK_CLIENT_SECRET) {
    return NextResponse.json(
      { success: false, error: "CHZZK_CLIENT_ID 또는 CHZZK_CLIENT_SECRET 환경변수가 설정되지 않았습니다." },
      { status: 500 }
    )
  }

  const supabase = createAdminClient()

  // 1. Client 인증 기반 Open API 호출 (라이브 목록 / 카테고리 검색 / 채널 정보)
  const { data: sampleStreamer } = await supabase
    .from("streamers")
    .select("channel_id")
    .not("channel_id", "is", null)
    .limit(1)
    .maybeSingle()

  const clientPings: EndpointPingResult[] = [
    await pingClientEndpoint("/open/v1/lives?size=1"),
    await pingClientEndpoint("/open/v1/categories/search?query=talk&size=1"),
  ]

  if (sampleStreamer?.channel_id) {
    clientPings.push(
      await pingClientEndpoint(`/open/v1/channels?channelIds=${encodeURIComponent(sampleStreamer.channel_id)}`)
    )
  }

  const clientApiSuccessCount = clientPings.filter((p) => p.ok).length

  // 2. 연동된 치지직 OAuth 계정이 있으면 Refresh Token 갱신 및 유저 정보 조회(Scope) 호출
  let oauthResult: {
    status: "success" | "needs_reconnect" | "not_connected" | "error"
    channelName?: string
    error?: string
  } = { status: "not_connected" }

  const { data: account } = await supabase
    .from("connected_accounts")
    .select("*")
    .eq("provider", "chzzk")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (account) {
    const logData: {
      target_user_id: string
      status: string
      token_refreshed: boolean
      profile_fetched: boolean
      target_channel_id?: string
      target_channel_name?: string
      error_message?: string
    } = {
      target_user_id: account.user_id,
      status: "failure",
      token_refreshed: false,
      profile_fetched: false,
    }

    try {
      if (!account.refresh_token_encrypted) {
        throw new Error("FORMAT_ERROR: 저장된 리프레시 토큰이 없습니다.")
      }

      const refreshToken = decryptString(account.refresh_token_encrypted)
      const newTokenData = await refreshChzzkToken(refreshToken)
      logData.token_refreshed = true

      const encryptedAccessToken = encryptString(newTokenData.accessToken)
      const encryptedRefreshToken = encryptString(newTokenData.refreshToken)
      const tokenExpiresAt = newTokenData.expiresIn
        ? new Date(Date.now() + newTokenData.expiresIn * 1000).toISOString()
        : null

      const { error: updateError } = await supabase
        .from("connected_accounts")
        .update({
          access_token_encrypted: encryptedAccessToken,
          refresh_token_encrypted: encryptedRefreshToken,
          token_expires_at: tokenExpiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id)

      if (updateError) throw updateError

      const profile = await getChzzkProfile(newTokenData.accessToken)
      logData.profile_fetched = true
      logData.target_channel_id = profile.channelId
      logData.target_channel_name = profile.channelName
      logData.status = "success"

      oauthResult = {
        status: "success",
        channelName: profile.channelName,
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unknown OAuth error"
      logData.error_message = msg
      const isReconnectNeeded =
        msg.includes("FORMAT_ERROR") ||
        msg.includes("KEY_MISMATCH") ||
        msg.includes("401") ||
        msg.includes("INVALID_TOKEN") ||
        msg.includes("토큰 갱신 실패")
      oauthResult = {
        status: isReconnectNeeded ? "needs_reconnect" : "error",
        error: msg,
      }
    }

    const { error: logErr } = await supabase.from("chzzk_keep_alive_logs").insert(logData)
    if (logErr) {
      console.error("chzzk_keep_alive_logs 기록 실패:", logErr)
    }
  }

  // Client API가 전부 실패했다면 500 반환하여 GitHub Actions가 실패로 감지하도록 처리
  if (clientApiSuccessCount === 0) {
    return NextResponse.json(
      {
        success: false,
        message: "모든 치지직 Client Open API 호출에 실패했습니다.",
        executedAt: new Date().toISOString(),
        clientApi: {
          successCount: clientApiSuccessCount,
          totalCount: clientPings.length,
          results: clientPings,
        },
        oauth: oauthResult,
      },
      { status: 500 }
    )
  }

  return NextResponse.json({
    success: true,
    message: "치지직 API Keep-Alive 호출을 완료했습니다.",
    executedAt: new Date().toISOString(),
    clientApi: {
      successCount: clientApiSuccessCount,
      totalCount: clientPings.length,
      results: clientPings,
    },
    oauth: oauthResult,
  })
}
