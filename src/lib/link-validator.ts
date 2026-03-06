export async function checkLinkAccessibility(url: string): Promise<'ok' | 'failed' | 'unknown'> {
  try {
    const response = await fetch(url, {
      method: 'HEAD',
      // 짧은 타임아웃
      signal: AbortSignal.timeout(3000), 
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    })
    
    // HEAD를 지원하지 않거나 405 응답인 경우 GET으로 폴백
    if (response.status === 405) {
      const getResponse = await fetch(url, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
        headers: {
          'Range': 'bytes=0-0', // 가능하면 최소한의 바이트만 요청
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'
        }
      })
      if (getResponse.ok) return 'ok'
    } else if (response.ok) {
      return 'ok'
    }
    
    // 접근 불가 처리 (404 등)
    return 'failed'
  } catch (error) {
    // 타임아웃, 네트워크 에러 등
    return 'failed'
  }
}
