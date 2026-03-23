"use client"

/**
 * OAuth 콜백 핸들러 — 치지직 OAuth redirectUri가 루트인 경우 콜백 처리
 *
 * page.tsx가 서버 컴포넌트로 전환됨에 따라,
 * useSearchParams/useRouter를 사용하는 이 로직을 별도 클라이언트 컴포넌트로 분리.
 */

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

export function OAuthCallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const code = searchParams.get('code')
    const state = searchParams.get('state')
    const error = searchParams.get('error')

    if (code && state) {
      router.replace(`/api/auth/chzzk/callback?code=${code}&state=${state}`)
    } else if (error) {
      router.replace(`/api/auth/chzzk/callback?error=${error}`)
    }
  }, [router, searchParams])

  return null
}
