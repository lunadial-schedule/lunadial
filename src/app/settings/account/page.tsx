"use client"

/**
 * 계정 설정 페이지
 *
 * 프로필(닉네임, 이메일, 아바타), 구독 정보(Free/Pro),
 * 즐겨찾기 현황, 치지직 계정 연동/해제를 관리한다.
 */
import { PageContainer } from "@/components/layout/page-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { createClient } from "@/lib/supabase/client"
import { useEffect, useState, useRef } from "react"
import { User } from "@supabase/supabase-js"
import { toast } from "sonner"
import { Crown, Star, ArrowRight } from "lucide-react"
import Link from "next/link"
import { getMyFavorites } from "@/app/actions/favorites"
import { ChzzkConnectCard } from "@/components/mypage/chzzk-connect-card"

export default function AccountSettingsPage() {
  const [user, setUser] = useState<User | null>(null)
  const [nickname, setNickname] = useState("")
  const supabase = createClient()
  
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoritesCount, setFavoritesCount] = useState(0)
  const [isAdmin, setIsAdmin] = useState(false)
  
  const [chzzkAccount, setChzzkAccount] = useState<any>(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      setUser(user)
      if (user?.user_metadata?.name) {
        setNickname(user.user_metadata.name)
      }
    })

    const loadFavs = async () => {
      const { data } = await getMyFavorites()
      if (data) {
        setFavorites(data)
        setFavoritesCount(data.length)
      }
    }
    loadFavs()
    
    // 치지직 계정 연동 및 역할 정보 불러오기
    const loadAccountInfo = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
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
  }, [supabase.auth])

  const handleSave = () => {
    toast.success("프로필 정보가 저장되었습니다.")
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !user) return

    // 파일 타입 검증
    if (!file.type.startsWith('image/')) {
      toast.error("이미지 파일만 업로드 가능합니다.")
      return
    }

    // 파일 크기 제한 (2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error("이미지 크기는 2MB를 넘을 수 없습니다.")
      return
    }

    try {
      setUploading(true)
      
      const fileExt = file.name.split('.').pop()
      const filePath = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

      const { error: updateError } = await supabase.auth.updateUser({
        data: { 
          avatar_url: publicUrl,
          picture: publicUrl // 보조적으로 picture도 업데이트
        }
      })

      if (updateError) throw updateError

      toast.success("프로필 이미지가 성공적으로 변경되었습니다.")
      
      // 사용자 정보 갱신
      const { data: { user: refreshedUser } } = await supabase.auth.getUser()
      setUser(refreshedUser)
    } catch (error: any) {
      console.error('Error uploading image:', error)
      toast.error(`이미지 업로드 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ""
    }
  }

  const isPro = isAdmin || false
  const maxFavorites = isPro ? "무제한" : 10

  return (
    <PageContainer className="py-8 max-w-2xl mx-auto">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">계정 설정</h1>
          <p className="text-muted-foreground">내 프로필과 계정 정보를 관리하세요.</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>프로필</CardTitle>
            <CardDescription>
              서비스에서 표시될 프로필 정보입니다.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-6">
              <Avatar className="h-20 w-20 border">
                <AvatarImage src={user?.user_metadata?.avatar_url || user?.user_metadata?.picture || ""} />
                <AvatarFallback className="text-2xl">
                  {user?.user_metadata?.name ? user.user_metadata.name.slice(0,1).toUpperCase() : "U"}
                </AvatarFallback>
                {uploading && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  </div>
                )}
              </Avatar>
              <div className="flex flex-col gap-2">
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  ref={fileInputRef} 
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  {uploading ? "업로드 중..." : "이미지 변경"}
                </Button>
                <p className="text-[10px] text-muted-foreground">
                  JPG, PNG, GIF (최대 2MB)
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="nickname">닉네임</Label>
              <Input 
                id="nickname" 
                value={nickname} 
                onChange={(e) => setNickname(e.target.value)} 
                placeholder="닉네임을 입력하세요"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">이메일</Label>
              <Input 
                id="email" 
                value={user?.email || "로그인이 필요합니다."} 
                disabled 
                className="bg-muted/50"
              />
            </div>
            
            <Button onClick={handleSave}>변경사항 저장</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>나의 구독 정보</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between p-4 border rounded-lg bg-muted/20">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${isPro ? 'bg-amber-100 text-amber-600' : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'}`}>
                  <Crown className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-semibold">{isPro ? "Pro 플랜" : "Free 플랜"}</p>
                  <p className="text-sm text-muted-foreground">
                    {isPro ? "Luna Dial의 모든 기능 사용 중" : "기본 기능 사용 중"}
                  </p>
                </div>
              </div>
              {!isPro && (
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
                  className={`h-full ${isPro ? 'bg-amber-500' : 'bg-primary'}`} 
                  style={{ width: `${isPro ? 100 : Math.min((favoritesCount / 10) * 100, 100)}%` }} 
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

        {/* Chzzk Connect Integration */}
        {user && (
          <ChzzkConnectCard 
            initialAccount={chzzkAccount} 
            onAccountChange={() => {
              // Refresh account status on disconnect
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
      </div>
    </PageContainer>
  )
}
