"use client"

/**
 * AuthProvider — 앱 전체에서 Supabase 인증 상태를 공유하는 컨텍스트
 *
 * 문제: 각 컴포넌트(AppHeader, CreateScheduleDialog, ScheduleDetailDrawer 등)가
 * 독립적으로 supabase.auth.getUser() + onAuthStateChange를 호출하여
 * 메인페이지 1회 로드 시 /auth/v1/user 호출이 약 33회 발생.
 *
 * 해결: AuthProvider에서 1회만 getUser() 호출 + onAuthStateChange 구독하고,
 * 하위 컴포넌트는 useAuth() 훅으로 user 정보를 공유한다.
 */

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import type { User } from "@supabase/supabase-js"
import { useRouter } from "next/navigation"

interface AuthContextValue {
  user: User | null
  profile: { nickname: string | null; avatar_url: string | null } | null
  isLoading: boolean
  refreshProfile: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  profile: null,
  isLoading: true,
  refreshProfile: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<AuthContextValue['profile']>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const router = useRouter()
  const supabase = React.useMemo(() => createClient(), [])

  // 마지막으로 profile fetch한 user id를 추적하여 중복 호출 방지
  const lastProfileUserIdRef = React.useRef<string | null>(null)

  const fetchProfile = React.useCallback(async (userId: string) => {
    lastProfileUserIdRef.current = userId
    const { data } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", userId)
      .maybeSingle()
    if (data) {
      setProfile(data)
    } else {
      setProfile(null)
    }
  }, [supabase])

  const refreshProfile = React.useCallback(async () => {
    if (user?.id) {
      await fetchProfile(user.id)
    }
  }, [user, fetchProfile])

  React.useEffect(() => {
    // 1단계: getSession()으로 로컬 세션을 즉시 읽어 UI를 빠르게 표시
    // getSession()은 로컬 스토리지/쿠키에서 읽으므로 서버 왕복 불필요 (< 1ms)
    supabase.auth.getSession().then(({ data: { session } }) => {
      const sessionUser = session?.user ?? null
      if (sessionUser) {
        setUser(sessionUser)
        fetchProfile(sessionUser.id).finally(() => setIsLoading(false))
      } else {
        setIsLoading(false)
      }

      // 2단계: 백그라운드에서 getUser()로 서버 검증 (토큰 유효성 확인)
      // 세션이 만료/무효화된 경우에만 user 상태를 업데이트
      supabase.auth.getUser().then(({ data: { user: verifiedUser } }) => {
        const verifiedId = verifiedUser?.id ?? null
        const sessionId = sessionUser?.id ?? null
        if (verifiedId !== sessionId) {
          // 세션과 서버 검증 결과가 다를 때만 상태 업데이트
          setUser(verifiedUser)
          if (verifiedUser) {
            fetchProfile(verifiedUser.id)
          } else {
            setProfile(null)
            lastProfileUserIdRef.current = null
          }
        }
      })
    })

    // 인증 상태 변경 구독 (로그인/로그아웃/토큰 갱신)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)
        
        if (_event === 'SIGNED_IN' || _event === 'SIGNED_OUT') {
           router.refresh()
        }

        if (currentUser) {
          // 동일 유저에 대한 중복 profile fetch 방지
          if (lastProfileUserIdRef.current !== currentUser.id) {
            fetchProfile(currentUser.id)
          }
        } else {
          lastProfileUserIdRef.current = null
          setProfile(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile])

  const value = React.useMemo(() => ({ user, profile, isLoading, refreshProfile }), [user, profile, isLoading, refreshProfile])

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

/** 현재 인증 상태를 가져오는 훅. AuthProvider 내에서만 사용 가능. */
export function useAuth() {
  return React.useContext(AuthContext)
}
