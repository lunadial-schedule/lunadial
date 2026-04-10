/**
 * 치지직 Open API 관련 타입 정의
 */

/** 치지직 라이브 목록 API 응답의 개별 라이브 항목 */
export interface ChzzkLiveItem {
  liveId: number
  liveTitle: string
  liveThumbnailImageUrl: string | null
  concurrentUserCount: number
  openDate: string
  adult: boolean
  tags: string[]
  categoryType: string
  liveCategory: string
  liveCategoryValue: string
  channelId: string
  channelName: string
  channelImageUrl: string | null
}

/** 치지직 라이브 목록 API 전체 응답 */
export interface ChzzkLivesResponse {
  code: number
  message: string | null
  content: {
    data: ChzzkLiveItem[]
    page: {
      next: string | null
    }
  }
}

