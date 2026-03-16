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
      next: {
        concurrentUserCount: number
        liveId: number
      } | null
    }
  }
}

/** 프론트에 내려줄 트렌딩 카테고리 카드 데이터 */
export interface TrendingCategoryCard {
  categoryId: string
  categoryName: string
  categoryImageUrl: string | null
  liveCount: number
  totalViewerCount: number
  updatedAt: string
}

/** /api/trending-categories 응답 형태 */
export interface TrendingCategoriesResponse {
  categories: TrendingCategoryCard[]
  updatedAt: string
  cached: boolean
}
