/**
 * 계정 삭제 서비스
 *
 * 클라이언트에서 계정 삭제 API를 호출하기 위한 래퍼.
 * UI에서 직접 fetch 호출을 하지 않고 이 서비스를 통해 호출한다.
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
