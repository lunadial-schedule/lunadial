import { createClient } from '@supabase/supabase-js'

/**
 * 🔒 Supabase 어드민 클라이언트 (Service Role)
 *
 * [역할 및 주의사항]
 * - SUPABASE_SERVICE_ROLE_KEY를 사용하여 생성되는 최고 권한(Admin) 클라이언트입니다.
 * - 데이터베이스의 모든 RLS(Row Level Security) 정책을 우회하며, 무조건 읽기/쓰기가 가능합니다.
 * 
 * ⚠️ 치명적 주의 구간:
 * 1. 보안 위험: 브라우저 환경이나 일반 사용자 세션 로직에 절대 섞어서 사용하지 마세요. (환경변수 유출 주의)
 * 2. 사용 시기: 일반 사용자 권한으로는 불가능한 시스템 백필, 자동 배치 로직, 권한 없는 계정 강제 삭제 등에만 국한하여 사용합니다.
 * 3. 이 파일이 import되는 곳(`src/app/api/admin/system/*` 등)은 반드시 별도의 어드민 권한 체크 훅이 선행되어야 합니다.
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
