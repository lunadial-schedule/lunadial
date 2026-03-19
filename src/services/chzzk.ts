/**
 * Chzzk (치지직) API Server actions & services
 */
import { CHZZK_CLIENT_ID, CHZZK_CLIENT_SECRET, CHZZK_OPENAPI_BASE_URL } from '@/config/env'
import type { ChzzkLiveItem, ChzzkLivesResponse } from '@/types/chzzk'

interface ChzzkChannelResponse {
  code: number
  message: string | null
  content: {
    data: {
      channelId: string
      channelName: string
      channelImageUrl: string
      followerCount: number
      verifiedMark: boolean
    }[]
  }
}

interface ChzzkCategoryResponse {
  code: number
  message: string | null
  content: {
    data: {
      categoryType: string
      categoryId: string
      categoryValue: string
      posterImageUrl: string
    }[]
  }
}

/** 공통 헤더 생성 — Client ID / Secret은 서버 환경변수에서만 읽음 */
function getChzzkHeaders(): HeadersInit {
  return {
    'Client-Id': CHZZK_CLIENT_ID,
    'Client-Secret': CHZZK_CLIENT_SECRET,
    'Content-Type': 'application/json',
  }
}

/**
 * 치지직 채널 정보를 조회합니다.
 * @param channelIds 채널 ID 목록 (최대 20개)
 */
export async function getChzzkChannels(channelIds: string[]) {
  if (!channelIds.length) return []

  try {
    const url = new URL(`${CHZZK_OPENAPI_BASE_URL}/open/v1/channels`)
    channelIds.slice(0, 20).forEach(id => url.searchParams.append('channelIds', id))
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getChzzkHeaders(),
    })

    if (!response.ok) {
      console.error(`Chzzk API Error: ${response.status}`)
      return []
    }

    const json = (await response.json()) as ChzzkChannelResponse
    if (json.code === 200 && json.content?.data) {
      return json.content.data
    }
    return []
  } catch (error) {
    console.error('Failed to fetch Chzzk channels', error)
    return []
  }
}

/**
 * 카테고리(게임 등)를 검색합니다.
 * @param query 검색어
 */
export async function searchChzzkCategory(query: string) {
  if (!query) return []

  try {
    const url = new URL(`${CHZZK_OPENAPI_BASE_URL}/open/v1/categories/search`)
    url.searchParams.append('query', query)
    url.searchParams.append('size', '20')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: getChzzkHeaders(),
    })

    if (!response.ok) {
      return []
    }

    const json = (await response.json()) as ChzzkCategoryResponse
    if (json.code === 200 && json.content?.data) {
      return json.content.data
    }
    return []
  } catch (error) {
    console.error('Failed to search Chzzk categories', error)
    return []
  }
}

/**
 * 치지직 현재 라이브 목록을 페이지네이션으로 조회합니다.
 * 시청자 수 내림차순으로 정렬된 결과를 반환합니다.
 * @param maxPages 최대 페이지 수 (기본 Infinity — 전체 수집, 페이지당 20개)
 */
export async function getChzzkLives(maxPages = Infinity): Promise<ChzzkLiveItem[]> {
  const allItems: ChzzkLiveItem[] = []
  let nextCursor: string | null = null

  for (let page = 0; page < maxPages; page++) {
    try {
      const url = new URL(`${CHZZK_OPENAPI_BASE_URL}/open/v1/lives`)
      url.searchParams.append('size', '20')

      if (nextCursor) {
        url.searchParams.append('next', nextCursor)
      }

      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: getChzzkHeaders(),
      })

      if (!response.ok) {
        console.error(`Chzzk Lives API Error: ${response.status}`)
        break
      }

      const json = (await response.json()) as ChzzkLivesResponse

      if (json.code !== 200 || !json.content?.data) {
        break
      }

      allItems.push(...json.content.data)

      // 다음 페이지 커서가 없으면 종료
      nextCursor = json.content.page?.next ?? null
      if (!nextCursor) break
    } catch (error) {
      console.error(`Failed to fetch Chzzk lives (page ${page})`, error)
      break
    }
  }

  return allItems
}
