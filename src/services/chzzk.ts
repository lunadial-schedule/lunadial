/**
 * Chzzk (치지직) API Server actions & services
 */
import { CHZZK_CLIENT_ID, CHZZK_CLIENT_SECRET } from '@/config/env'

const CHZZK_API_URL = 'https://openapi.chzzk.naver.com'

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

/**
 * 치지직 채널 정보를 조회합니다.
 * @param channelIds 채널 ID 목록 (최대 20개)
 */
export async function getChzzkChannels(channelIds: string[]) {
  if (!channelIds.length) return []

  try {
    const url = new URL(`${CHZZK_API_URL}/open/v1/channels`)
    channelIds.slice(0, 20).forEach(id => url.searchParams.append('channelIds', id))
    
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Client-Id': CHZZK_CLIENT_ID,
        'Client-Secret': CHZZK_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
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

/**
 * 카테고리(게임 등)를 검색합니다.
 * @param query 검색어
 */
export async function searchChzzkCategory(query: string) {
  if (!query) return []

  try {
    const url = new URL(`${CHZZK_API_URL}/open/v1/categories/search`)
    url.searchParams.append('query', query)
    url.searchParams.append('size', '20')

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        'Client-Id': CHZZK_CLIENT_ID,
        'Client-Secret': CHZZK_CLIENT_SECRET,
        'Content-Type': 'application/json'
      }
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
