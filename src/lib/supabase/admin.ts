import { createClient } from '@supabase/supabase-js'

/**
 * 서버 전용 Supabase 어드민 클라이언트 (Service Role Key 사용)
 * - RLS를 우회하므로 서버 사이드 로직(푸시 발송 등)에서만 사용해야 함.
 * - 브라우저에는 절대 노출 금지!
 */
export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !secretKey) {
    throw new Error('Supabase URL or Service Role Key is missing in environment variables.')
  }

  return createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
}
