import { NextResponse } from 'next/server'
import { getTrendingCategories } from '@/services/trending-categories'

export const revalidate = 600 // ISR: 10분 캐시

export async function GET() {
  try {
    const result = await getTrendingCategories()

    return NextResponse.json(result, {
      headers: {
        'Cache-Control': 'public, s-maxage=600, stale-while-revalidate=900',
      },
    })
  } catch {
    return NextResponse.json(
      { error: '카테고리 데이터를 불러오지 못했습니다.' },
      { status: 500 },
    )
  }
}
