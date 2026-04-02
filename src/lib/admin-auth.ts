import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * 🛡️ 관리자 운영 API (Admin Ops) 공통 보호 규칙
 *
 * [역할 및 주의사항]
 * - 이 함수는 일반 Next.js 미들웨어나 Supabase RLS로 제어할 수 없는 시스템 API 라우트
 *   (예: dev 백필 라우트, 강제 배치 동작 등)에 대한 '서버 간', 혹은 '브라우저 관리자 세션' 접근을 보호합니다.
 * 
 * [인증 방식]
 * 1. 환경 변수 `ADMIN_OPS_TOKEN`과 요청(Request) 헤더의 `x-admin-token` 값을 엄격히 비교 (서버 스크립트 용도)
 * 2. 혹은 브라우저 세션(Supabase Auth) 기반으로 user_roles.role === 'admin'인지 체크
 */
export async function assertAdminOpsAuthorized(req: Request): Promise<NextResponse | null> {
  const adminToken = process.env.ADMIN_OPS_TOKEN;
  const reqToken = req.headers.get('x-admin-token');
  
  // 1. 서버 간 통신 / 배치 스크립트용 고정 토큰 확인
  if (adminToken && reqToken === adminToken) {
    return null; // Authorized
  }

  // 2. 브라우저 세션(Admin Dashboard UI 등)을 통한 호출인지 확인
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
      const { data: roleData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .maybeSingle();

      if (roleData?.role === 'admin') {
        return null; // Authorized
      }
    }
  } catch (err) {
    // 세션 파싱 에러 도어 패스
  }

  // 3. 둘 다 실패할 경우
  return NextResponse.json(
    { success: false, error: "Unauthorized" },
    { status: 401 }
  );
}
