import { NextResponse } from 'next/server'

export async function GET() {
  const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID
  const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET

  if (!CHZZK_CLIENT_ID || !CHZZK_CLIENT_SECRET) {
    return NextResponse.json({ error: 'Missing Chzzk API credentials' }, { status: 500 })
  }

  try {
    const res = await fetch('https://openapi.chzzk.naver.com/open/v1/lives?size=5', {
      headers: {
        'Client-Id': CHZZK_CLIENT_ID,
        'Client-Secret': CHZZK_CLIENT_SECRET,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 30 }, // 30초 정적 캐싱으로 레이트리밋 및 부하 방지
    })

    if (!res.ok) {
      throw new Error(`Naver OpenAPI error: ${res.status} ${res.statusText}`)
    }

    const { content } = await res.json()
    
    // 치지직 API 응답 스펙에 맞춤: content 내부의 data 배열
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
    console.error('Failed to fetch Chzzk live top:', error)
    return NextResponse.json({ error: 'Failed to fetch live streams' }, { status: 500 })
  }
}
