/**
 * 치지직 OAuth 토큰 / 프로필 관리 (서버 전용)
 *
 * OAuth 인증 코드로 토큰을 교환하고, 사용자 프로필을 조회하며,
 * 계정 연동 해제 시 토큰을 철회하는 함수들을 제공한다.
 */

/** 치지직 토큰 교환 응답 */
interface ChzzkTokenResponse {
  accessToken: string
  refreshToken: string
  expiresIn: number
  tokenType: string
}

/** 치지직 사용자 프로필 응답 */
interface ChzzkProfileResponse {
  channelId: string
  channelName: string
}

/**
 * 인증 코드(authorization code)를 액세스 토큰으로 교환한다.
 * @param code - 치지직에서 발급한 인증 코드
 * @param state - CSRF 방지용 state 값
 * @returns 액세스/리프레시 토큰 정보
 */
export async function authorizeChzzkToken(code: string, state: string): Promise<ChzzkTokenResponse> {
  const clientId = process.env.CHZZK_CLIENT_ID
  const clientSecret = process.env.CHZZK_CLIENT_SECRET
  const redirectUri = process.env.CHZZK_REDIRECT_URI

  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error("Missing Chzzk environment variables")
  }

  const tokenUrl = "https://openapi.chzzk.naver.com/auth/v1/token"
  
  const body = JSON.stringify({
    grantType: "authorization_code",
    clientId,
    clientSecret,
    code,
    state
  })

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body
  })

  const responseText = await response.text()

  if (!response.ok) {
    console.error("치지직 토큰 교환 실패. Status:", response.status)
    console.error("치지직 토큰 교환 응답:", responseText)
    throw new Error(`토큰 교환 실패 (${response.status}): ${responseText}`)
  }

  const data = JSON.parse(responseText)
  return {
    accessToken: data.content.accessToken,
    refreshToken: data.content.refreshToken,
    expiresIn: data.content.expiresIn,
    tokenType: data.content.tokenType
  }
}

/**
 * 액세스 토큰으로 치지직 사용자 프로필(채널 ID, 채널명)을 조회한다.
 * @param accessToken - 치지직 액세스 토큰
 * @returns 채널 ID와 채널명
 */
export async function getChzzkProfile(accessToken: string): Promise<ChzzkProfileResponse> {
  const profileUrl = "https://openapi.chzzk.naver.com/open/v1/users/me"

  const response = await fetch(profileUrl, {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    }
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error("치지직 프로필 조회 실패:", errText)
    throw new Error(`프로필 조회 실패: ${response.status}`)
  }

  const data = await response.json()
  return {
    channelId: data.content.channelId,
    channelName: data.content.channelName
  }
}

/**
 * 치지직 액세스 토큰을 철회한다 (계정 연동 해제 시 호출).
 * 실패해도 에러를 throw하지 않고 로그만 남긴다.
 * @param accessToken - 철회할 액세스 토큰
 */
export async function revokeChzzkToken(accessToken: string): Promise<void> {
  const clientId = process.env.CHZZK_CLIENT_ID
  const clientSecret = process.env.CHZZK_CLIENT_SECRET
  
  if (!clientId || !clientSecret) return

  const revokeUrl = "https://openapi.chzzk.naver.com/auth/v1/token/revoke"
  const body = new URLSearchParams()
  body.append("clientId", clientId)
  body.append("clientSecret", clientSecret)
  body.append("accessToken", accessToken)

  try {
    const res = await fetch(revokeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: body.toString()
    })
    
    if (!res.ok) {
      console.error("토큰 철회 실패, status:", res.status)
    }
  } catch (error) {
    console.error("토큰 철회 중 에러:", error)
  }
}
