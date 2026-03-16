/**
 * 치지직 인기 라이브 목록 API
 *
 * 시청자 수 기준 상위 5개 라이브 스트림을 반환한다.
 * 30초 정적 캐싱으로 레이트리밋 및 부하를 방지한다.
 */
import { NextResponse } from 'next/server'

export async function GET() {
  const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID
  const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET

  if (!CHZZK_CLIENT_ID || !CHZZK_CLIENT_SECRET) {
    return NextResponse.json({ error: '치지직 API 인증 정보 누락' }, { status: 500 })
  }

  try {
    const res = await fetch('https://openapi.chzzk.naver.com/open/v1/lives?size=5', {
      headers: {
        'Client-Id': CHZZK_CLIENT_ID,
        'Client-Secret': CHZZK_CLIENT_SECRET,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }, // 30초 캐싱
    })

    if (!res.ok) {
      throw new Error(`치지직 API 에러: ${res.status} ${res.statusText}`)
    }

    const { content } = await res.json()
    
    // 프론트에서 사용할 형태로 매핑
    const items = content?.data?.map((item: any) => ({
      channelId: item.channelId,
      channelName: item.channelName,
      profileImageUrl: item.channelImageUrl,
      liveTitle: item.liveTitle,
      viewerCount: item.concurrentUserCount,
      liveUrl: `https://chzzk.naver.com/live/${item.channelId}`
    })) || []

    return NextResponse.json({
      updatedAt: new Date().toISOString(),
      items 
    })
  } catch (error) {
    console.error('치지직 인기 라이브 조회 실패:', error)
    return NextResponse.json({ error: '라이브 스트림 조회 실패' }, { status: 500 })
  }
}
