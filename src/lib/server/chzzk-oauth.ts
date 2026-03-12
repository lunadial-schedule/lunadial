import crypto from "crypto"
import { cookies } from "next/headers"

const CHZZK_OAUTH_STATE_COOKIE = "chzzk_oauth_state"

export async function getChzzkOAuthUrl(): Promise<string> {
  const clientId = process.env.CHZZK_CLIENT_ID
  const redirectUri = process.env.CHZZK_REDIRECT_URI
  const authBaseUrl = process.env.CHZZK_AUTH_URL || "https://chzzk.naver.com/account-interlock"

  if (!clientId || !redirectUri) {
    throw new Error("Missing Chzzk OAuth environment variables")
  }

  // Generate random state
  const state = crypto.randomBytes(16).toString("hex")

  const cookieStore = await cookies()
  // 10분 유효기간, HttpOnly
  cookieStore.set(CHZZK_OAUTH_STATE_COOKIE, state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10 
  })

  const params = new URLSearchParams()
  params.append("clientId", clientId)
  params.append("redirectUri", redirectUri)
  params.append("state", state)

  return `${authBaseUrl}?${params.toString()}`
}

export async function verifyChzzkState(receivedState: string): Promise<boolean> {
  const cookieStore = await cookies()
  const savedState = cookieStore.get(CHZZK_OAUTH_STATE_COOKIE)?.value

  // 사용 후 쿠키 삭제
  if (savedState) {
    cookieStore.delete(CHZZK_OAUTH_STATE_COOKIE)
  }

  return !!savedState && savedState === receivedState
}
