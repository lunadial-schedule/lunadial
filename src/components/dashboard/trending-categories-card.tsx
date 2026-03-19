"use client"

/**
 * 지금 뜨는 카테고리 카드 — 치지직 전체 라이브 기준 카테고리 집계
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Info, RefreshCw } from "lucide-react"
import Image from "next/image"
import { useCallback, useEffect, useState } from "react"
import type { TrendingCategoryCard, TrendingCategoriesResponse } from "@/types/chzzk"
import { getRelativeTimeString } from "@/lib/utils"

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
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [relativeTime, setRelativeTime] = useState<string>('방금 전')

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
      setUpdatedAt(data.updatedAt)
      setRelativeTime(getRelativeTimeString(data.updatedAt))
      setFetchState('success')
    } catch (error) {
      console.error('Failed to fetch trending categories:', error)
      setFetchState('error')
    }
  }, [])

  useEffect(() => {
    fetchCategories()
  }, [fetchCategories])

  useEffect(() => {
    if (!updatedAt) return
    
    // 1분마다 표시 시간 갱신
    const interval = setInterval(() => {
      setRelativeTime(getRelativeTimeString(updatedAt))
    }, 60000)
    
    // 컴포넌트 마운트/언마운트 시 즉각 반영
    setRelativeTime(getRelativeTimeString(updatedAt))
    
    return () => clearInterval(interval)
  }, [updatedAt])

  return (
    <Card className="border-border/50 shadow-sm flex flex-col h-full lg:h-[510px]">
      <CardHeader className="h-10 px-3 py-1.5 flex flex-row items-center justify-between border-b shrink-0 space-y-0">
        <div className="flex items-center justify-between gap-2 w-full">
          <CardTitle className="text-[15px] font-bold m-0 flex items-center gap-1.5">
            지금 뜨는 카테고리
          </CardTitle>
          <div className="flex items-center">
            {fetchState !== 'loading' && updatedAt && (
              <span className="text-[11px] text-muted-foreground font-medium mr-2">{relativeTime}</span>
            )}
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-7 w-7 text-muted-foreground hover:text-foreground rounded-md shrink-0"
              onClick={fetchCategories}
              disabled={fetchState === 'loading'}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${fetchState === 'loading' ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-2.5 pb-3 px-3 md:pt-3 md:pb-3 md:px-3 flex-1">
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
          <div className="grid grid-cols-3 gap-2">
            {categories.slice(0, 6).map((category) => (
              <div 
                key={category.categoryId} 
                className="flex flex-col gap-1.5 group cursor-default"
              >
                <div className="relative w-full aspect-[4/5] rounded-lg overflow-hidden bg-muted border border-border/20 shadow-sm">
                  {category.categoryImageUrl ? (
                    <Image
                      src={category.categoryImageUrl}
                      alt={category.categoryName}
                      fill
                      className="object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xl text-muted-foreground font-bold bg-muted/80">
                      {category.categoryName.slice(0, 1)}
                    </div>
                  )}
                  {/* 시청자 수 배지 (좌상단) */}
                  <div className="absolute top-1.5 left-1.5 bg-black/70 backdrop-blur-sm text-white text-[10px] font-medium px-1.5 py-0.5 rounded flex items-center gap-1 z-10">
                    <div className="w-1 h-1 rounded-full bg-red-500 shrink-0" />
                    {formatViewerCount(category.totalViewerCount)}
                  </div>
                </div>
                
                {/* 텍스트 영역 */}
                <div className="flex flex-col px-0.5 justify-between flex-1 min-h-[36px]">
                  <span className="text-[13px] font-semibold truncate leading-tight">
                    {category.categoryName}
                  </span>
                  <span className="text-[11px] text-muted-foreground mt-0.5 truncate flex items-center gap-1">
                    라이브 <span className="font-semibold text-foreground/80">{category.liveCount.toLocaleString()}</span>
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
