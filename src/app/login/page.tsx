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
          redirectTo: `${window.location.origin}/auth/callback?next=/`
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
          className="w-full h-12 flex items-center justify-center gap-3 bg-white hover:bg-zinc-50 text-zinc-900 border border-zinc-300 rounded-md shadow-sm transition-all font-medium" 
          onClick={handleGoogleLogin}
          disabled={loading}
        >
          {loading ? (
            "로그인 중..."
          ) : (
            <>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className="size-5">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z"/>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
              </svg>
              <span>Google 계정으로 로그인</span>
            </>
          )}
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
