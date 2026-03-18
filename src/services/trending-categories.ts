/**
 * 트렌딩 카테고리 집계 서비스
 *
 * 치지직 전체 라이브 데이터를 수집하여 카테고리별 라이브 수 / 시청자 수를 집계하고
 * 메모리 캐시(10분 TTL)를 적용하여 과도한 API 호출을 방지한다.
 */
import { getChzzkLives, searchChzzkCategory } from '@/services/chzzk'
import type { ChzzkLiveItem, TrendingCategoryCard } from '@/types/chzzk'

const CACHE_TTL_MS = 600_000 // 10분
const TOP_CATEGORY_COUNT = 6

interface CachedResult {
  categories: TrendingCategoryCard[]
  updatedAt: string
  cachedAt: number
}

let cache: CachedResult | null = null
/** API 실패 시 fallback용 — 마지막 성공 데이터 */
let lastSuccessData: CachedResult | null = null

interface AggregatedCategory {
  categoryId: string
  categoryName: string
  liveCount: number
  totalViewerCount: number
}

/**
 * 라이브 아이템 목록을 카테고리별로 그룹핑하여 집계한다.
 * totalViewerCount 내림차순으로 상위 6개를 반환한다.
 * 이미지는 별도의 카테고리 검색 API로 가져와야 하므로 여기서는 포함하지 않는다.
 */
function aggregateByCategory(lives: ChzzkLiveItem[]): AggregatedCategory[] {
  const categoryMap = new Map<
    string,
    { name: string; liveCount: number; totalViewerCount: number }
  >()

  for (const live of lives) {
    if (!live.liveCategory) continue

    const existing = categoryMap.get(live.liveCategory)
    if (existing) {
      existing.liveCount += 1
      existing.totalViewerCount += live.concurrentUserCount
    } else {
      categoryMap.set(live.liveCategory, {
        name: live.liveCategoryValue || live.liveCategory,
        liveCount: 1,
        totalViewerCount: live.concurrentUserCount,
      })
    }
  }

  return Array.from(categoryMap.entries())
    .map(([categoryId, data]) => ({
      categoryId,
      categoryName: data.name,
      liveCount: data.liveCount,
      totalViewerCount: data.totalViewerCount,
    }))
    .sort((a, b) => b.totalViewerCount - a.totalViewerCount)
    .slice(0, TOP_CATEGORY_COUNT)
}

/**
 * 집계된 카테고리 목록에 대해 치지직 카테고리 검색 API로 posterImageUrl을 가져온다.
 * 검색 실패 시 해당 카테고리의 이미지는 null로 처리한다.
 */
async function enrichWithCategoryImages(
  categories: AggregatedCategory[],
): Promise<TrendingCategoryCard[]> {
  const now = new Date().toISOString()

  const results = await Promise.allSettled(
    categories.map(async (cat) => {
      const searchResults = await searchChzzkCategory(cat.categoryName)
      // 검색 결과 중 카테고리 ID가 일치하거나, 첫 번째 결과의 이미지를 사용
      const matched = searchResults.find((r) => r.categoryId === cat.categoryId)
      const imageUrl = matched?.posterImageUrl || searchResults[0]?.posterImageUrl || null

      return {
        categoryId: cat.categoryId,
        categoryName: cat.categoryName,
        categoryImageUrl: imageUrl,
        liveCount: cat.liveCount,
        totalViewerCount: cat.totalViewerCount,
        updatedAt: now,
      } satisfies TrendingCategoryCard
    }),
  )

  return results.map((result, idx) => {
    if (result.status === 'fulfilled') return result.value
    // 검색 실패 시 이미지 없이 반환
    return {
      categoryId: categories[idx].categoryId,
      categoryName: categories[idx].categoryName,
      categoryImageUrl: null,
      liveCount: categories[idx].liveCount,
      totalViewerCount: categories[idx].totalViewerCount,
      updatedAt: now,
    }
  })
}

/**
 * 트렌딩 카테고리 데이터를 반환한다.
 * 캐시가 유효하면 캐시를 반환하고, 그렇지 않으면 API를 호출하여 집계한다.
 */
export async function getTrendingCategories(): Promise<{
  categories: TrendingCategoryCard[]
  updatedAt: string
  cached: boolean
}> {
  // 캐시가 유효하면 반환
  if (cache && Date.now() - cache.cachedAt < CACHE_TTL_MS) {
    return {
      categories: cache.categories,
      updatedAt: cache.updatedAt,
      cached: true,
    }
  }

  try {
    // 전체 라이브를 수집 (페이지 제한 없음)
    const lives = await getChzzkLives()

    if (lives.length === 0) {
      if (lastSuccessData) {
        return {
          categories: lastSuccessData.categories,
          updatedAt: lastSuccessData.updatedAt,
          cached: true,
        }
      }
      return { categories: [], updatedAt: new Date().toISOString(), cached: false }
    }

    const aggregated = aggregateByCategory(lives)
    const categories = await enrichWithCategoryImages(aggregated)
    const updatedAt = new Date().toISOString()

    cache = { categories, updatedAt, cachedAt: Date.now() }
    lastSuccessData = { ...cache }

    return { categories, updatedAt, cached: false }
  } catch (error) {
    console.error('Failed to aggregate trending categories:', error)

    if (lastSuccessData) {
      return {
        categories: lastSuccessData.categories,
        updatedAt: lastSuccessData.updatedAt,
        cached: true,
      }
    }

    throw error
  }
}
