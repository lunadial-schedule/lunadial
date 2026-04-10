"use client"

/**
 * 계정 설정 페이지
 *
 * 구독 정보(Free/Pro), 즐겨찾기 현황,
 * 치지직 계정 연동/해제, 계정 삭제를 관리한다.
 */
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useMemo } from "react"
import { toast } from "sonner"
import { Crown, Star, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getMyFavorites } from "@/app/actions/favorites"
import { ChzzkConnectCard } from "@/components/mypage/chzzk-connect-card"
import { DeleteAccountSection } from "@/components/mypage/delete-account-section"
import { useAuth } from "@/components/providers/auth-provider"
import { ENABLE_CHZZK_CONNECT } from "@/config/env"

export default function AccountSettingsPage() {
  const { user, isLoading: isAuthLoading } = useAuth()
  const supabase = useMemo(() => createClient(), [])
  
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userRole, setUserRole] = useState<string>("user")
  const [chzzkAccount, setChzzkAccount] = useState<any | null>(null)
  const [isRoleLoaded, setIsRoleLoaded] = useState(false)

  useEffect(() => {
    if (!user) return

    const loadAccountInfo = async () => {
      try {
        const { data: favs } = await getMyFavorites()
        if (favs) {
          setFavorites(favs)
          setFavoritesCount(favs.length)
        }

        const { data: chzzkData } = await supabase
          .from("connected_accounts")
          .select("*")
          .eq("user_id", user.id)
          .eq("provider", "chzzk")
          .maybeSingle()
        if (chzzkData) {
          setChzzkAccount(chzzkData)
        }

        const { data: roleData } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .maybeSingle()
        if (roleData?.role === 'admin') {
          setIsAdmin(true)
        }
        if (roleData?.role) {
          setUserRole(roleData.role)
        }
      } catch (error) {
        console.error("Failed to load account info:", error)
      } finally {
        setIsRoleLoaded(true)
      }
    }

    loadAccountInfo()

    // OAuth 결과 처리
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search)
      if (sp.get('chzzk_success')) {
        toast.success("치지직 계정 연동이 완료되었습니다.")
        window.history.replaceState({}, '', window.location.pathname)
      }
      const err = sp.get('chzzk_error')
      const details = sp.get('details')
      if (err) {
        if (err === 'already_linked') toast.error("이미 다른 계정에 연동된 치지직 계정입니다.")
        else if (err === 'canceled') toast.error("치지직 연동이 취소되었습니다.")
        else toast.error(`치지직 연동 중 오류가 발생했습니다. ${details ? `(${details})` : ''}`)
        window.history.replaceState({}, '', window.location.pathname)
      }
    }
  }, [supabase])

  const isPro = isAdmin || userRole === 'pro'
  const isProOrAdmin = isPro || isAdmin
  const maxFavorites = !isRoleLoaded ? "-" : (isPro ? "무제한" : 10)

  return (
    <PageContainer className="py-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계정 설정</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>나의 구독 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                {isRoleLoaded ? (
                  <>
                    <div className={`p-2 rounded-full ${isPro ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                      <Crown className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="font-semibold">{isPro ? "Pro 플랜" : "Free 플랜"}</p>
                      <p className="text-sm text-muted-foreground">
                        {isPro ? "Luna Dial의 모든 기능 사용 중" : "기본 기능 사용 중"}
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-2 rounded-full bg-muted animate-pulse">
                      <Crown className="h-5 w-5 text-muted-foreground/30" />
                    </div>
                    <div className="space-y-2">
                      <div className="h-4 w-20 bg-muted rounded animate-pulse" />
                      <div className="h-3 w-32 bg-muted rounded animate-pulse" />
                    </div>
                  </>
                )}
              </div>
              {isRoleLoaded && !isPro && (
                <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white" asChild>
                  <Link href="/pro">업그레이드</Link>
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Star className="h-4 w-4 text-muted-foreground" />
                  즐겨찾기 현황
                </Label>
                <span className="text-sm">
                  <span className="font-medium text-foreground">{favoritesCount}</span>
                  <span className="text-muted-foreground"> / {maxFavorites}</span>
                </span>
              </div>
              <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  className={`h-full ${!isRoleLoaded ? 'bg-muted-foreground/20' : isPro ? 'bg-amber-500' : 'bg-primary'}`} 
                  style={{ width: `${!isRoleLoaded ? 0 : isPro ? 100 : Math.min((favoritesCount / 10) * 100, 100)}%` }} 
                />
              </div>
              
              {favoritesCount > 0 && (
                <div className="pt-2">
                  <div className="flex flex-wrap gap-2">
                    {favorites.slice(0, 10).map((fav) => {
                      const streamer = fav.streamers;
                      return (
                        <div key={fav.id} className="flex items-center gap-1.5 bg-muted/50 px-2 py-1.5 rounded-md border text-sm">
                          <Avatar className="h-5 w-5">
                            <AvatarImage src={streamer?.image_url || undefined} alt={streamer?.name} />
                            <AvatarFallback className="text-[10px]">{streamer?.name?.[0]}</AvatarFallback>
                          </Avatar>
                          <span className="truncate max-w-[80px] font-medium">{streamer?.name}</span>
                        </div>
                      )
                    })}
                    {favoritesCount > 10 && (
                      <div className="flex items-center justify-center px-2 py-1.5 rounded-md border border-dashed text-xs text-muted-foreground font-medium">
                        +{favoritesCount - 10}명
                      </div>
                    )}
                  </div>
                  <div className="mt-3 flex justify-end">
                    <Button variant="link" size="sm" className="h-auto p-0 text-muted-foreground hover:text-foreground" asChild>
                      <Link href="/favorites">
                        전체 목록 관리 <ArrowRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {ENABLE_CHZZK_CONNECT && user && (
          <ChzzkConnectCard 
            initialAccount={chzzkAccount} 
            onAccountChange={() => {
              supabase
                .from("connected_accounts")
                .select("*")
                .eq("user_id", user.id)
                .eq("provider", "chzzk")
                .maybeSingle()
                .then(({ data }) => setChzzkAccount(data || null))
            }}
          />
        )}

        {user && (
          <DeleteAccountSection isProOrAdmin={isProOrAdmin} isRoleLoaded={isRoleLoaded} />
        )}
      </div>
    </PageContainer>
  )
}
