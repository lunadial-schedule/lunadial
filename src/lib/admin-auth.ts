import { NextResponse } from 'next/server';

/**
 * 🛡️ 관리자 운영 API (Admin Ops) 공통 보호 규칙
 *
 * [역할 및 주의사항]
 * - 이 함수는 일반 Next.js 미들웨어나 Supabase RLS로 제어할 수 없는 시스템 API 라우트
 *   (예: dev 백필 라우트, 강제 배치 동작 등)에 대한 '서버 간', 혹은 '관리자 스크립트' 접근을 보호합니다.
 * 
 * [인증 방식]
 * - 환경 변수 `ADMIN_OPS_TOKEN`과 요청(Request) 헤더의 `x-admin-token` 값을 엄격히 비교합니다.
 * - 즉, 이 API들을 브라우저(클라이언트)에서 함부로 찌를 수 없게 막는 1차 방어선 역할을 합니다.
 * 
 * ⚠️ 수정 시 주의점:
 * - 여기를 잘못 수정하면 인증 없이 민감한 시스템 API가 외부로 노출될 위험이 큽니다!
 * - 권한 에러 시 일관되게 401 Unauthorized를 반환하여 호출 측이 즉각 차단되었음을 알게 해야 합니다.
 *
 * @param req Request 객체
 * @returns 인가가 실패하면 NextResponse(401 또는 500)를 반환하고, 성공하면 null 반환
 */
export function assertAdminOpsAuthorized(req: Request): NextResponse | null {
  const adminToken = process.env.ADMIN_OPS_TOKEN;
  
  if (!adminToken) {
    console.error("ADMIN_OPS_TOKEN is not configured on the server.");
    return NextResponse.json(
      { success: false, error: "서버에 관리자 토큰(ADMIN_OPS_TOKEN)이 설정되지 않았습니다." },
      { status: 500 }
    );
  }

  const reqToken = req.headers.get('x-admin-token');
  
  if (!reqToken || reqToken !== adminToken) {
    return NextResponse.json(
      { success: false, error: "Unauthorized" },
      { status: 401 }
    );
  }

  return null; // Authorized
}
