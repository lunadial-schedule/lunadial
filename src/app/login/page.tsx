"use client"

/**
 * 로그인 페이지
 *
 * Google OAuth를 통한 소셜 로그인을 제공한다.
 * 로그인 성공 시 /auth/callback → /calendar로 리다이렉트된다.
 */
import { Button } from "@/components/ui/button"
import { createClient } from "@/lib/supabase/client"
import { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"

function LoginContent() {
  const [loading, setLoading] = useState(false)
  const searchParams = useSearchParams()
  const error = searchParams.get('error')

  const handleGoogleLogin = async () => {
    try {
      setLoading(true)
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback?next=/calendar`
        }
      })
      if (error) throw error
    } catch (error) {
      console.error('Error logging in:', error)
      alert('로그인 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950 p-4">
      <div className="w-full max-w-sm space-y-8 p-8 bg-white dark:bg-zinc-900 rounded-xl shadow-lg border">
        <div className="space-y-2 text-center">
          <h1 className="text-2xl font-bold">LUNA DIAL 로그인</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            스트리머 일정을 관리하려면 로그인하세요.
          </p>
        </div>
        
        {error && (
          <div className="p-3 text-sm text-red-500 bg-red-100 rounded-md">
            {error}
          </div>
        )}

        <Button 
          className="w-full h-12 flex items-center gap-2" 
          variant="outline"
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? "로그인 중..." : "Google 계정으로 로그인"}
        </Button>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginContent />
    </Suspense>
  )
}
