/**
 * 링크 접근성 검증 유틸
 *
 * URL이 실제로 접근 가능한지 HEAD 요청으로 확인한다.
 * 일정에 포함된 외부 링크의 유효성 검사에 사용된다.
 */

/**
 * URL의 접근 가능 여부를 확인한다.
 * @param url - 검증할 URL
 * @returns 'ok' (정상) | 'failed' (접근 불가/타임아웃)
 */
export async function checkLinkAccessibility(url: string): Promise<'ok' | 'failed' | 'unknown'> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: AbortSignal.timeout(3000), // 3초 타임아웃
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    // HEAD 미지원(405) 시 GET으로 재시도 (최소 바이트만 요청)
    if (response.status === 405) {
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
        headers: {
          'Range': 'bytes=0-0',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })
      if (getResponse.ok) return 'ok'
    } else if (response.ok) {
      return 'ok'
    }
    
    return 'failed'
  } catch {
    // 타임아웃, 네트워크 에러 등
    return 'failed'
  }
}
