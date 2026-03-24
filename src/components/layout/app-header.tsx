"use client"

/**
 * 앱 헤더 — 네비게이션, 로그인/로그아웃, 모바일 메뉴
 */

import * as React from "react"
import Link from "next/link"
import Image from "next/image"
import { PageContainer } from "@/components/layout/page-container"
import { Search, Plus, Calendar as CalendarIcon, Star, Crown, X } from "lucide-react"
import { CreateScheduleDialog } from "@/components/dashboard/create-schedule-dialog"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/components/providers/auth-provider"
import { useRouter, usePathname } from "next/navigation"

export function AppHeader() {
  const { user } = useAuth()
  const [searchQuery, setSearchQuery] = React.useState("")
  const [profile, setProfile] = React.useState<{ nickname: string | null; avatar_url: string | null } | null>(null)
  const supabase = React.useMemo(() => createClient(), [])
  const router = useRouter()
  const pathname = usePathname()

  React.useEffect(() => {
    if (user) {
      const fetchProfile = async () => {
        const { data } = await supabase
          .from("profiles")
          .select("nickname, avatar_url")
          .eq("id", user.id)
          .maybeSingle()
        if (data) setProfile(data)
      }
      fetchProfile()
    } else {
      setProfile(null)
    }
  }, [user, supabase])

  const handleLogout = async () => {
    const isProtectedPage = pathname === "/favorites" || pathname.startsWith("/settings")
    await supabase.auth.signOut()
    toast.success("로그아웃 되었습니다.")
    if (isProtectedPage) {
      router.push("/")
    } else {
      router.refresh()
    }
  }

  const handleSearch = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const isCalendarPage = window.location.pathname === '/calendar'
      
      if (isCalendarPage) {
        // 캘린더 페이지 내에서 검색할 경우, 뷰(view) 등 기존 파라미터를 유지하면서 q만 덮어씀
        const currentParams = new URLSearchParams(window.location.search)
        if (searchQuery.trim()) {
          currentParams.set('q', searchQuery.trim())
        } else {
          currentParams.delete('q') // 빈 검색어면 파라미터 날려서 전체 렌더링
        }
        router.push(`/calendar?${currentParams.toString()}`)
      } else {
        // 메인 페이지 등 다른 곳에서 검색할 경우, 기존처럼 초기화된 상태(월간 달력 등 기본 상태)로 이동
        router.push(`/calendar?q=${encodeURIComponent(searchQuery.trim())}`)
      }
    }
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <PageContainer className="flex flex-wrap lg:flex-nowrap items-center justify-between lg:h-16 py-3 lg:py-0 gap-y-3 lg:gap-y-0">
        {/* Left: Logo & Nav */}
        <div className="flex items-center gap-3 lg:gap-8 w-auto">
          <Link href="/" className="flex items-center space-x-2 shrink-0">
            <Image src="/logo.png" alt="LUNA DIAL" width={140} height={36} className="h-7 lg:h-8 w-auto" priority />
          </Link>
          <nav className="flex items-center gap-3 lg:gap-6 text-sm font-medium">
            <Link href="/calendar" className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", pathname === "/calendar" ? "text-foreground font-semibold" : "text-muted-foreground")}>
              <CalendarIcon className="h-4 w-4" />
              <span className="hidden lg:inline">캘린더</span>
            </Link>
            <Link href="/favorites" className={cn("flex items-center gap-1.5 transition-colors hover:text-foreground", pathname === "/favorites" ? "text-foreground font-semibold" : "text-muted-foreground")}>
              <Star className="h-4 w-4" />
              <span className="hidden lg:inline">즐겨찾기</span>
            </Link>
            <Link href="/pro" className={cn("flex items-center gap-1.5 transition-colors", pathname === "/pro" ? "text-amber-700 dark:text-amber-400 font-semibold" : "text-amber-600 hover:text-amber-700 dark:text-amber-500 dark:hover:text-amber-400")}>
              <Crown className="h-4 w-4" />
              <span className="hidden lg:inline">Pro</span>
            </Link>
          </nav>
        </div>

        {/* Center: Global Search (Row 2 on Mobile, Center on Desktop) */}
        <div className="w-full lg:w-auto lg:flex-1 flex lg:justify-center px-0 lg:px-4 order-3 lg:order-2 pb-1 lg:pb-0">
          <div className="w-full relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="스트리머, 일정 검색..."
              className="w-full h-10 lg:h-9 rounded-full bg-background pl-9 border border-border focus-visible:ring-1 focus-visible:ring-primary focus-visible:border-primary transition-all lg:w-[300px] xl:w-[400px]"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearch}
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 lg:gap-4 ml-auto w-auto order-2 lg:order-3">
          {/* Add Schedule (Desktop Only) */}
          <div className="hidden lg:block">
            <CreateScheduleDialog />
          </div>

          {/* User Profile */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Avatar className="h-8 w-8 cursor-pointer ring-1 ring-border">
                  <AvatarImage src={profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || ""} alt={profile?.nickname || user.user_metadata?.name || "User"} />
                  <AvatarFallback className="bg-primary/10 text-xs text-primary">
                    {(profile?.nickname || user.user_metadata?.name) ? (profile?.nickname || user.user_metadata.name).slice(0, 1).toUpperCase() : "U"}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{profile?.nickname || user.user_metadata?.name || '사용자'}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuItem asChild>
                  <Link href="/settings/account" className="w-full cursor-pointer">
                    계정 / 설정
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  className="text-destructive focus:text-destructive cursor-pointer"
                  onClick={handleLogout}
                >
                  로그아웃
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="default" size="sm" asChild>
              <Link href="/login">로그인</Link>
            </Button>
          )}
        </div>
      </PageContainer>
    </header>
  )
}
