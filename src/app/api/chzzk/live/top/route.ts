/**
 * 치지직 인기 라이브 목록 API
 *
 * 시청자 수 기준 상위 10개 라이브 스트림을 반환한다.
 * Next.js fetch revalidate의 Stale-While-Revalidate 특성(첫 진입 시 오래된 캐시 반환)을
 * 피하기 위해, 만료 시 최신 데이터를 즉시 대기(await)해 반환하는 명시적 30초 인메모리 TTL 캐시를 사용한다.
 */
import { type NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

interface TopLiveItem {
  channelId: string
  channelName: string
  profileImageUrl: string
  liveTitle: string
  viewerCount: number
  liveUrl: string
}

interface TopLivesCache {
  updatedAt: string
  items: TopLiveItem[]
  expiresAt: number
}

const CACHE_TTL_MS = 30 * 1000
let cachedTopLives: TopLivesCache | null = null
let inFlightTopLives: Promise<TopLivesCache> | null = null

async function fetchTopLivesFromChzzk(
  clientId: string,
  clientSecret: string
): Promise<TopLivesCache> {
  const res = await fetch('https://openapi.chzzk.naver.com/open/v1/lives?size=10', {
    headers: {
      'Client-Id': clientId,
      'Client-Secret': clientSecret,
      'Content-Type': 'application/json',
    },
    cache: 'no-store',
  })

  if (!res.ok) {
    throw new Error(`치지직 API 에러: ${res.status} ${res.statusText}`)
  }

  const { content } = (await res.json()) as {
    content?: {
      data?: Array<{
        channelId: string
        channelName: string
        channelImageUrl: string
        liveTitle: string
        concurrentUserCount: number
      }>
    }
  }

  const items: TopLiveItem[] =
    content?.data?.map((item) => ({
      channelId: item.channelId,
      channelName: item.channelName,
      profileImageUrl: item.channelImageUrl,
      liveTitle: item.liveTitle,
      viewerCount: item.concurrentUserCount,
      liveUrl: `https://chzzk.naver.com/live/${item.channelId}`,
    })) || []

  const now = Date.now()
  const payload: TopLivesCache = {
    updatedAt: new Date(now).toISOString(),
    items,
    expiresAt: now + CACHE_TTL_MS,
  }
  cachedTopLives = payload
  return payload
}

export async function GET(req: NextRequest) {
  const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID
  const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET

  if (!CHZZK_CLIENT_ID || !CHZZK_CLIENT_SECRET) {
    return NextResponse.json(
      { error: '치지직 API 인증 정보 누락' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }

  const forceRefresh = req.nextUrl.searchParams.get('refresh') === '1'
  const now = Date.now()

  try {
    let data: TopLivesCache

    if (!forceRefresh && cachedTopLives && cachedTopLives.expiresAt > now) {
      data = cachedTopLives
    } else if (!forceRefresh && inFlightTopLives) {
      data = await inFlightTopLives
    } else {
      const promise = fetchTopLivesFromChzzk(CHZZK_CLIENT_ID, CHZZK_CLIENT_SECRET)
      if (!forceRefresh) {
        inFlightTopLives = promise
      }
      try {
        data = await promise
      } finally {
        if (inFlightTopLives === promise) {
          inFlightTopLives = null
        }
      }
    }

    return NextResponse.json(
      {
        updatedAt: data.updatedAt,
        items: data.items,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0',
        },
      }
    )
  } catch (error) {
    console.error('치지직 인기 라이브 조회 실패:', error)
    return NextResponse.json(
      { error: '라이브 스트림 조회 실패' },
      { status: 500, headers: { 'Cache-Control': 'no-store, max-age=0' } }
    )
  }
}
