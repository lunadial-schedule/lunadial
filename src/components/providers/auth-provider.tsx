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
import { User } from "@supabase/supabase-js"

interface AuthContextValue {
  user: User | null
  isLoading: boolean
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  isLoading: true,
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const supabase = React.useMemo(() => createClient(), [])

  React.useEffect(() => {
    // 초기 사용자 정보 1회 조회
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      setIsLoading(false)
    })

    // 인증 상태 변경 구독 (로그인/로그아웃/토큰 갱신)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null)
        setIsLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase])

  const value = React.useMemo(() => ({ user, isLoading }), [user, isLoading])

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
