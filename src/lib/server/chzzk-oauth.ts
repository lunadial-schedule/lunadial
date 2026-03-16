/**
 * 치지직 OAuth 인증 유틸 (서버 전용)
 *
 * 치지직 계정 연동을 위한 OAuth 플로우를 처리한다.
 * - getChzzkOAuthUrl: 인증 URL 생성 + state 값을 쿠키에 저장
 * - verifyChzzkState: 콜백에서 state 값을 검증하여 CSRF 방지
 */
import crypto from "crypto"
import { cookies } from "next/headers"

/** state 값을 저장하는 쿠키 이름 */
const CHZZK_OAUTH_STATE_COOKIE = "chzzk_oauth_state"

/**
 * 치지직 OAuth 인증 URL을 생성한다.
 * 랜덤 state 값을 생성하여 쿠키에 저장하고, 인증 페이지 URL을 반환한다.
 * @returns 치지직 OAuth 인증 페이지 URL
 */
export async function getChzzkOAuthUrl(): Promise<string> {
  const clientId = process.env.CHZZK_CLIENT_ID
  const redirectUri = process.env.CHZZK_REDIRECT_URI
  const authBaseUrl = process.env.CHZZK_AUTH_URL || "https://chzzk.naver.com/account-interlock"

  if (!clientId || !redirectUri) {
    throw new Error("Missing Chzzk OAuth environment variables")
  }

  // CSRF 방지를 위한 랜덤 state 생성
  const state = crypto.randomBytes(16).toString("hex")

  const cookieStore = await cookies()
  cookieStore.set(CHZZK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10 // 10분 유효
  })

  const params = new URLSearchParams()
  params.append("clientId", clientId)
  params.append("redirectUri", redirectUri)
  params.append("state", state)

  return `${authBaseUrl}?${params.toString()}`
}

/**
 * OAuth 콜백에서 받은 state 값이 쿠키에 저장된 값과 일치하는지 검증한다.
 * 검증 후 쿠키는 즉시 삭제하여 재사용을 방지한다.
 * @param receivedState - 콜백 URL에서 받은 state 파라미터
 * @returns 일치 여부
 */
export async function verifyChzzkState(receivedState: string): Promise<boolean> {
  const cookieStore = await cookies()
  const savedState = cookieStore.get(CHZZK_OAUTH_STATE_COOKIE)?.value

  // 검증 후 쿠키 삭제 (일회성)
  if (savedState) {
    cookieStore.delete(CHZZK_OAUTH_STATE_COOKIE)
  }

  return !!savedState && savedState === receivedState
}
