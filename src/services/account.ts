/**
 * ⚙️ 계정 관리 서비스 레이어
 *
 * [역할 및 주의사항]
 * - 클라이언트(UI)에서 서버(API API Route)로 계정 삭제(회원 탈퇴)를 요청하기 위한 통신 래퍼입니다.
 * - 클라이언트 컴포넌트가 Fetch API를 직결하는 대신, 이곳을 통해 일관된 에러 핸들링과 DTO 반환을 보장받습니다.
 *
 * ⚠️ 주의사항:
 * - 계정 탈퇴나 권한 정보는 DB 및 Storage 등 광범위한 정리 작업이 수반되므로
 *   반드시 API(서버 액션 또는 라우트 핸들러) 내에서 Supabase Auth 서버 검증이 이루어져야 합니다.
 * - 이곳은 오직 클라이언트용 브릿지 역할만 수행합니다.
 */

/** 계정 삭제 API 응답 타입 */
export interface DeleteAccountResponse {
  success?: boolean
  message?: string
  error?: string
}

/**
 * 계정 삭제 요청
 *
 * POST /api/account/delete 를 호출한다.
 * 서버에서 세션 기반으로 사용자를 식별하므로 별도 파라미터 불필요.
 */
export async function deleteAccount(): Promise<DeleteAccountResponse> {
  try {
    const response = await fetch("/api/account/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    })

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data: any = await response.json()

    if (!response.ok) {
      // TODO(배포 전 제거) 디버깅용 상세 에러 출력
      if (data.debug) {
        console.error("[계정 삭제] 서버 디버그 정보:", JSON.stringify(data.debug, null, 2))
      }
      return { error: data.error || "계정 삭제 중 문제가 발생했습니다." }
    }

    return data
  } catch {
    return {
      error: "네트워크 오류가 발생했습니다. 인터넷 연결을 확인하고 다시 시도해주세요.",
    }
  }
}
