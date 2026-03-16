"use client"

/**
 * 스트리머 자동완성 입력 — 치지직 API 검색 + DB 검색 + 신규 생성
 */

import * as React from "react"
import { Input } from "@/components/ui/input"
import { searchStreamers } from "@/app/actions/streamers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2 } from "lucide-react"

// useDebounce hook
function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

interface StreamerAutocompleteInputProps {
  name: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}

export function StreamerAutocompleteInput({ name, value, onChange, placeholder, required }: StreamerAutocompleteInputProps) {
  const debouncedValue = useDebounce(value, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const searchIdRef = React.useRef(0)

  // 외부 클릭 시 드롭다운 닫기
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  const performSearch = React.useCallback(async (query: string) => {
    if (!query.trim()) {
      setResults([])
      return
    }

    setIsLoading(true)
    const currentSearchId = ++searchIdRef.current

    try {
      const { data } = await searchStreamers(query)
      if (currentSearchId !== searchIdRef.current) return
      
      if (data) {
        setResults(data)
      }
    } catch (e) {
      if (currentSearchId === searchIdRef.current) console.error(e)
    } finally {
      if (currentSearchId === searchIdRef.current) setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    // 값이 입력되었고 드롭다운이 열려 있을 때만 검색 실행 (이미 선택된 후 값이 변경되면 다시 검색)
    if (isOpen) {
      performSearch(debouncedValue)
    }
  }, [debouncedValue, isOpen, performSearch])

  const handleSelect = (streamerName: string) => {
    onChange(streamerName)
    setIsOpen(false)
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
    setIsOpen(true)
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <Input
        name={name}
        placeholder={placeholder}
        required={required}
        value={value}
        onChange={handleInputChange}
        onFocus={() => {
          if (value.trim()) setIsOpen(true)
        }}
        autoComplete="off"
      />

      {isOpen && value.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[220px] overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-4 px-2 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>검색 중...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="py-4 px-3 text-sm text-muted-foreground flex flex-col gap-1">
              <span className="font-medium text-foreground">'{value}' 검색 결과가 없습니다.</span>
              <span className="text-xs">일정을 등록하면 스트리머가 자동으로 추가됩니다.</span>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="flex flex-col py-1">
              <li className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">스트리머 목록</li>
              {results.map((streamer) => (
                <li
                  key={streamer.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleSelect(streamer.name)}
                >
                  <Avatar className="h-6 w-6 border">
                    <AvatarImage src={streamer.image_url || undefined} alt={streamer.name} />
                    <AvatarFallback className="text-[10px]">{streamer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-sm font-medium truncate">{streamer.name}</span>
                    {streamer.verified_mark && (
                      <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded-sm dark:bg-green-900/30 dark:text-green-400 font-medium">단독</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
