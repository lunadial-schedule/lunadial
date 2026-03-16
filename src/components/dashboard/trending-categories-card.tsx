"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Info } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import type { TrendingCategoryCard, TrendingCategoriesResponse } from "@/types/chzzk"

function formatViewerCount(count: number): string {
  if (count >= 10000) {
    return `${(count / 10000).toFixed(1).replace(/\.0$/, '')}만명`
  }
  return `${count.toLocaleString()}명`
}

type FetchState = 'loading' | 'error' | 'empty' | 'success'

export function TrendingCategoriesCard() {
  const [categories, setCategories] = useState<TrendingCategoryCard[]>([])
  const [fetchState, setFetchState] = useState<FetchState>('loading')

  const fetchCategories = useCallback(async () => {
    try {
      setFetchState('loading')
      const res = await fetch('/api/trending-categories')

      if (!res.ok) {
        throw new Error(`API error: ${res.status}`)
      }

      const data: TrendingCategoriesResponse = await res.json()

      if (!data.categories || data.categories.length === 0) {
        setCategories([])
        setFetchState('empty')
        return
      }

      setCategories(data.categories)
      setFetchState('success')
    } catch (error) {
      console.error('Failed to fetch trending categories:', error)
      setFetchState('error')
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  return (
    <Card className="border-border/50 shadow-sm flex-1">
      <CardHeader className="p-[14px] md:p-4 min-h-[52px] md:min-h-[56px] flex flex-row items-center justify-between space-y-0 shrink-0">
        <div className="flex items-center gap-1.5">
          <CardTitle className="text-base font-bold m-0 pl-1">지금 뜨는 카테고리</CardTitle>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Info className="h-3.5 w-3.5 text-muted-foreground/60 cursor-help" />
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs max-w-[300px]">
                <p>시청자 수 상위 500개 라이브 기준으로 집계됩니다.</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent className="p-[14px] md:p-4 pt-0 md:pt-0 pb-4 md:pb-4">
        {fetchState === 'loading' ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></span>
            <p>카테고리 데이터를 불러오는 중...</p>
          </div>
        ) : fetchState === 'error' ? (
          <div className="py-8 flex flex-col items-center justify-center text-destructive text-sm gap-2 text-center">
            <Info className="h-5 w-5 opacity-70" />
            <p>카테고리 정보를 불러오지 못했습니다.<br/>잠시 후 다시 시도해주세요.</p>
          </div>
        ) : fetchState === 'empty' ? (
          <div className="py-8 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
            <Info className="h-5 w-5 opacity-50" />
            <p>현재 집계 중인 카테고리가 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:gap-3 md:gap-4">
            {categories.map((category) => (
              <div 
                key={category.categoryId} 
                className="flex flex-col gap-2 group cursor-default"
              >
                <div className="relative w-full aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-border/10 shadow-sm">
                  {category.categoryImageUrl ? (
                    <Image
                      src={category.categoryImageUrl}
                      alt={category.categoryName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl text-muted-foreground font-bold bg-muted/80">
                      {category.categoryName.slice(0, 1)}
                    </div>
                  )}
                  {/* 시청자 수 배지 (좌상단) */}
                  <div className="absolute top-2 left-2 bg-black/70 backdrop-blur-sm text-white text-[11px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1.5 z-10">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
                    {formatViewerCount(category.totalViewerCount)}
                  </div>
                </div>
                
                {/* 텍스트 영역 */}
                <div className="flex flex-col px-0.5">
                  <span className="text-sm font-semibold line-clamp-1 leading-snug">
                    {category.categoryName}
                  </span>
                  <span className="text-xs text-muted-foreground mt-0.5">
                    라이브 {category.liveCount.toLocaleString()}개
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
