"use client"

/**
 * AuthProvider — 앱 전체에서 Supabase 인증 상태를 공유하는 단일 컨텍스트
 *
 * 최적화 원칙:
 * 1. getUser()를 명시적으로 호출하지 않는다.
 *    → 미들웨어가 이미 토큰을 검증/갱신 완료. 클라이언트에서 재검증 불필요.
 * 2. onAuthStateChange의 INITIAL_SESSION 이벤트로 사용자 상태를 1회 확인한다.
 *    → getUser() + onAuthStateChange 이중 호출로 인한 profile 2회 fetch 문제 해결.
 * 3. profile과 favoriteStreamerNames를 여기서 1회 조회하여 하위 컴포넌트에 공유한다.
 *    → AppHeader, TodayScheduleCard 등이 각각 fetch하는 중복 호출 방지.
 * 4. TOKEN_REFRESHED 이벤트에서는 데이터를 재조회하지 않는다.
 *    → 토큰 갱신은 user 레퍼런스만 업데이트.
 */

import * as React from "react"
import { createClient } from "@/lib/supabase/client"
import { User } from "@supabase/supabase-js"

interface AuthContextValue {
  user: User | null
  profile: { nickname: string | null; avatar_url: string | null } | null
  favoriteStreamerNames: string[]
  isLoading: boolean
  refreshProfile: () => Promise<void>
  refreshFavorites: () => Promise<void>
}

const AuthContext = React.createContext<AuthContextValue>({
  user: null,
  profile: null,
  favoriteStreamerNames: [],
  isLoading: true,
  refreshProfile: async () => {},
  refreshFavorites: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<User | null>(null)
  const [profile, setProfile] = React.useState<AuthContextValue['profile']>(null)
  const [favoriteStreamerNames, setFavoriteStreamerNames] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const supabase = React.useMemo(() => createClient(), [])

  const fetchProfile = React.useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("profiles")
      .select("nickname, avatar_url")
      .eq("id", userId)
      .maybeSingle()
    setProfile(data ?? null)
  }, [supabase])

  const fetchFavoriteNames = React.useCallback(async (userId: string) => {
    const { data } = await supabase
      .from("favorites")
      .select("streamers(name)")
      .eq("user_id", userId)
    if (data) {
      const names = data
        .map((f: any) => (f.streamers as any)?.name)
        .filter(Boolean) as string[]
      setFavoriteStreamerNames(names)
    } else {
      setFavoriteStreamerNames([])
    }
  }, [supabase])

  const refreshProfile = React.useCallback(async () => {
    if (user?.id) await fetchProfile(user.id)
  }, [user, fetchProfile])

  const refreshFavorites = React.useCallback(async () => {
    if (user?.id) {
      await fetchFavoriteNames(user.id)
    } else {
      setFavoriteStreamerNames([])
    }
  }, [user, fetchFavoriteNames])

  React.useEffect(() => {
    /**
     * onAuthStateChange 하나로 초기 인증 + 상태 변경을 모두 처리.
     *
     * INITIAL_SESSION: 마운트 시 1회 발행. 쿠키에서 복구된 세션을 전달받음.
     *   → profile + favorites를 병렬 1회 조회. 완료 후 isLoading = false.
     * SIGNED_IN: 로그인 완료 시. profile + favorites 재조회.
     * SIGNED_OUT: 로그아웃 시. 상태 초기화.
     * TOKEN_REFRESHED: 토큰 자동 갱신. user만 갱신, 데이터 재조회 없음.
     */
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const currentUser = session?.user ?? null
        setUser(currentUser)

        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN') {
          if (currentUser) {
            await Promise.all([
              fetchProfile(currentUser.id),
              fetchFavoriteNames(currentUser.id),
            ])
          } else {
            setProfile(null)
            setFavoriteStreamerNames([])
          }
          if (event === 'INITIAL_SESSION') {
            setIsLoading(false)
            performance?.mark?.('lunadial:auth-resolved')
          }
        } else if (event === 'SIGNED_OUT') {
          setProfile(null)
          setFavoriteStreamerNames([])
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, fetchProfile, fetchFavoriteNames])

  // 즐겨찾기 변경 이벤트 수신 (addFavorite/removeFavorite 후 dispatch)
  React.useEffect(() => {
    const handle = () => { if (user?.id) fetchFavoriteNames(user.id) }
    window.addEventListener('favoritesUpdated', handle)
    return () => window.removeEventListener('favoritesUpdated', handle)
  }, [user, fetchFavoriteNames])

  const value = React.useMemo(
    () => ({ user, profile, favoriteStreamerNames, isLoading, refreshProfile, refreshFavorites }),
    [user, profile, favoriteStreamerNames, isLoading, refreshProfile, refreshFavorites]
  )

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
