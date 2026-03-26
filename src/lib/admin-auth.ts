import { NextResponse } from 'next/server';

/**
 * 관리자 운영 API (Admin Ops) 공통 보호 규칙
 * 환경 변수 ADMIN_OPS_TOKEN 과 요청 헤더의 x-admin-token 을 비교합니다.
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
