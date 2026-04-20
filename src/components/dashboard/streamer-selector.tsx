"use client"

import * as React from "react"
import { Check, Loader2, Search, X } from "lucide-react"
import { Input } from "@/components/ui/input"
import { cn, normalizeStreamerName } from "@/lib/utils"
import { searchStreamers } from "@/app/actions/streamers"
import type { StreamerShortInfo } from "@/types/streamer"
import { VerifiedBadge } from "@/components/ui/verified-badge"
import Image from "next/image"

interface StreamerSelectorProps {
  value: string | null // streamerId
  onSelect: (streamer: StreamerShortInfo | null) => void
  placeholder?: string
  initialLabel?: string
  className?: string
  name?: string
}

export function StreamerSelector({
  value,
  onSelect,
  placeholder = "스트리머 검색",
  initialLabel = "",
  className,
  name
}: StreamerSelectorProps) {
  const [inputValue, setInputValue] = React.useState(initialLabel)
  const [results, setResults] = React.useState<StreamerShortInfo[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const [selectedStreamer, setSelectedStreamer] = React.useState<StreamerShortInfo | null>(null)
  
  const containerRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // 초기값 동기화 (수정 모드 등)
  React.useEffect(() => {
    if (value && initialLabel && !selectedStreamer) {
      setSelectedStreamer({ id: value, name: initialLabel })
      setInputValue(initialLabel)
    }
  }, [value, initialLabel, selectedStreamer])

  // 외부 클릭 시 닫기
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  // 검색 로직
  const handleSearch = React.useCallback(async (term: string) => {
    if (!term.trim()) {
      setResults([])
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    const res = await searchStreamers(term)
    setIsLoading(false)

    if (res.data) {
      setResults(res.data)
      
      // Exact Match 체크
      const normalizedTerm = normalizeStreamerName(term)
      const exactMatches = res.data.filter(s => normalizeStreamerName(s.name) === normalizedTerm)
      
      if (exactMatches.length === 1) {
        // 정확히 1명만 일치하면 자동 확정
        const confirmed = exactMatches[0]
        setSelectedStreamer(confirmed)
        setInputValue(confirmed.name)
        onSelect(confirmed)
        setIsOpen(false)
      } else {
        setIsOpen(true)
      }
    }
  }, [onSelect])

  // Debounce search
  React.useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue !== (selectedStreamer?.name || "")) {
        handleSearch(inputValue)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [inputValue, handleSearch, selectedStreamer])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setInputValue(val)
    
    // 입력이 변하면 기존 선택 해제
    if (selectedStreamer && val !== selectedStreamer.name) {
      setSelectedStreamer(null)
      onSelect(null)
    }
    
    setHighlightedIndex(-1)
  }

  const handleSelect = (streamer: StreamerShortInfo) => {
    setSelectedStreamer(streamer)
    setInputValue(streamer.name)
    onSelect(streamer)
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === "ArrowDown") setIsOpen(true)
      return
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % results.length)
        break
      case "ArrowUp":
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + results.length) % results.length)
        break
      case "Enter":
        e.preventDefault()
        if (highlightedIndex >= 0 && results[highlightedIndex]) {
          handleSelect(results[highlightedIndex])
        } else {
          // Enter 입력 시점에도 Exact Match 한 번 더 체크
          const normalizedInput = normalizeStreamerName(inputValue)
          const exactMatches = results.filter(s => normalizeStreamerName(s.name) === normalizedInput)
          if (exactMatches.length === 1) {
            handleSelect(exactMatches[0])
          }
        }
        break
      case "Escape":
        setIsOpen(false)
        break
    }
  }

  const isSelected = !!selectedStreamer

  return (
    <div className={cn("relative w-full", className)} ref={containerRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          name={name}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && results.length > 0 && setIsOpen(true)}
          placeholder={placeholder}
          className={cn(
            "pr-10 h-10 transition-all",
            isSelected && "border-primary bg-primary/5 ring-1 ring-primary/20"
          )}
          autoComplete="off"
        />
        <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
          {isLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : isSelected ? (
            <div className="bg-primary text-primary-foreground rounded-full p-0.5">
              <Check className="w-3 h-3" />
            </div>
          ) : (
            <Search className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </div>

      {/* 상태 메시지 안내 */}
      <div className="mt-1.5 min-h-[1.25rem]">
        {isSelected ? (
          <p className="text-[11px] font-medium text-primary flex items-center gap-1">
            <Check className="w-3.5 h-3.5" /> 선택됨: {selectedStreamer.name}
          </p>
        ) : inputValue.trim() ? (
          isLoading ? (
            <p className="text-[11px] text-muted-foreground animate-pulse">스트리머 검색 중...</p>
          ) : results.length === 0 ? (
            <p className="text-[11px] text-destructive">등록된 스트리머가 없습니다. 목록에서 다시 확인해주세요.</p>
          ) : results.length >= 2 && results.some(s => normalizeStreamerName(s.name) === normalizeStreamerName(inputValue)) ? (
             <p className="text-[11px] text-orange-600 font-medium">동일하거나 유사한 스트리머가 여러 명 있습니다. 목록에서 선택해주세요.</p>
          ) : (
            <p className="text-[11px] text-muted-foreground">목록에서 스트리머를 직접 클릭하거나 정확히 입력해주세요.</p>
          )
        ) : (
          <p className="text-[11px] text-muted-foreground">스트리머 이름을 입력해주세요.</p>
        )}
      </div>

      {/* Dropdown Results */}
      {isOpen && results.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-popover border rounded-md shadow-lg max-h-60 overflow-y-auto overflow-x-hidden animate-in fade-in zoom-in-95 duration-100">
          <ul className="py-1">
            {results.map((streamer, index) => (
              <li
                key={streamer.id}
                onClick={() => handleSelect(streamer)}
                className={cn(
                  "px-3 py-2 text-sm cursor-pointer flex items-center gap-3 transition-colors",
                  index === highlightedIndex ? "bg-accent text-accent-foreground" : "hover:bg-accent/50"
                )}
              >
                <div className="relative w-7 h-7 shrink-0 rounded-full overflow-hidden bg-muted border border-border/50">
                  {streamer.image_url ? (
                    <Image
                      src={streamer.image_url}
                      alt={streamer.name}
                      fill
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] font-bold text-muted-foreground">
                      {streamer.name[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="font-medium truncate flex items-center gap-1.5">
                    {streamer.name}
                    {streamer.verified_mark && (
                      <VerifiedBadge size={14} />
                    )}
                  </div>
                </div>
                {selectedStreamer?.id === streamer.id && (
                  <Check className="w-4 h-4 text-primary" />
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

