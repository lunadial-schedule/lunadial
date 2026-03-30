"use client"

import { searchStreamers } from "@/app/actions/streamers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, X, Check } from "lucide-react"
import { normalizeStreamerName } from "@/lib/utils"
import { StreamerShortInfo } from "@/types/streamer"
import { VerifiedBadge } from "@/components/ui/verified-badge"

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

import * as React from "react"

interface StreamerMultiInputProps {
  value: StreamerShortInfo[]
  onChange: (value: StreamerShortInfo[]) => void
  placeholder?: string
  inputValue?: string
  onInputChange?: (val: string) => void
}

export function StreamerMultiInput({ value, onChange, placeholder, inputValue: externalInputValue, onInputChange: externalOnInputChange }: StreamerMultiInputProps) {
  const [internalInputValue, setInternalInputValue] = React.useState("")
  const inputValue = externalInputValue !== undefined ? externalInputValue : internalInputValue
  
  const setInputValue = React.useCallback((val: string) => {
    if (externalOnInputChange) {
      externalOnInputChange(val)
    } else {
      setInternalInputValue(val)
    }
  }, [externalOnInputChange])

  const debouncedValue = useDebounce(inputValue, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState(-1)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const searchIdRef = React.useRef(0)

  // Stale closure 방지를 위한 최신 상태 레퍼런스
  const latestProps = React.useRef({ value, onChange, setInputValue })
  React.useEffect(() => {
    latestProps.current = { value, onChange, setInputValue }
  }, [value, onChange, setInputValue])

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

        // Exact Match 체크 및 자동 추가
        const normalizedQuery = normalizeStreamerName(query)
        const exactMatches = data.filter(s => normalizeStreamerName(s.name) === normalizedQuery)
        
        if (exactMatches.length === 1) {
          const streamer = exactMatches[0]
          const { value: currentValue, onChange: currentOnChange, setInputValue: currentSetInputValue } = latestProps.current
          
          if (!currentValue.find(s => s.id === streamer.id)) {
            currentOnChange([...currentValue, { id: streamer.id, name: streamer.name }])
          }
          currentSetInputValue("")
          setIsOpen(false)
          setResults([])
        }
      }
    } catch (e) {
      if (currentSearchId === searchIdRef.current) console.error(e)
    } finally {
      if (currentSearchId === searchIdRef.current) setIsLoading(false)
    }
  }, [])

  React.useEffect(() => {
    if (isOpen && debouncedValue) {
      performSearch(debouncedValue)
    }
  }, [debouncedValue, isOpen, performSearch])

  const handleAddValue = (streamer: StreamerShortInfo) => {
    if (!value.find(s => s.id === streamer.id)) {
      onChange([...value, streamer])
    }
    setInputValue("")
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault()
      if (!isOpen) setIsOpen(true)
      else setHighlightedIndex(prev => (prev + 1) % results.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setHighlightedIndex(prev => (prev - 1 + results.length) % results.length)
    } else if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      if (isOpen && highlightedIndex >= 0 && results[highlightedIndex]) {
        handleAddValue({ id: results[highlightedIndex].id, name: results[highlightedIndex].name })
      } else if (inputValue.trim()) {
        // Enter 시점에도 Exact Match 체크
        const normalizedInput = normalizeStreamerName(inputValue)
        const exactMatches = results.filter(s => normalizeStreamerName(s.name) === normalizedInput)
        if (exactMatches.length === 1) {
          handleAddValue({ id: exactMatches[0].id, name: exactMatches[0].name })
        }
      }
    } else if (e.key === "Escape") {
      setIsOpen(false)
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleRemove = (streamerId: string) => {
    onChange(value.filter(s => s.id !== streamerId))
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {value.map((streamer) => (
          <span key={streamer.id} className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-secondary-foreground font-medium text-xs">
            {streamer.name}
            <button
              type="button"
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={() => handleRemove(streamer.id)}
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        <input
          className="flex-1 bg-transparent outline-none min-w-[80px] text-base md:text-sm placeholder:text-muted-foreground"
          placeholder={value.length === 0 ? placeholder : ""}
          value={inputValue}
          onChange={(e) => {
            setInputValue(e.target.value)
            setIsOpen(true)
            setHighlightedIndex(-1)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (inputValue.trim()) setIsOpen(true)
          }}
          autoComplete="off"
        />
      </div>

      {isOpen && inputValue.trim() && (
        <div className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-[220px] overflow-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-4 px-2 text-sm text-muted-foreground gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>검색 중...</span>
            </div>
          )}

          {!isLoading && results.length === 0 && (
            <div className="py-4 px-3 text-sm text-muted-foreground">
              <span>'{inputValue}' 검색 결과가 없습니다.</span>
              <p className="text-xs text-blue-500/80 mt-1">찾는 스트리머가 없다면 이메일로 추가 문의해주세요.</p>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="flex flex-col py-1">
              <li className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">스트리머 목록</li>
              {results.map((streamer) => (
                <li
                  key={streamer.id}
                  className={`flex items-center gap-2 px-3 py-2 cursor-pointer transition-colors ${
                    results.indexOf(streamer) === highlightedIndex ? "bg-accent text-accent-foreground" : "hover:bg-muted"
                  }`}
                  onClick={() => handleAddValue({ id: streamer.id, name: streamer.name })}
                >
                  <Avatar className="h-6 w-6 border">
                    <AvatarImage src={streamer.image_url || undefined} alt={streamer.name} />
                    <AvatarFallback className="text-[10px]">{streamer.name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex items-center gap-1.5 min-w-0 flex-1">
                    <span className="text-sm font-medium truncate">{streamer.name}</span>
                    {streamer.verified_mark && (
                      <VerifiedBadge size={14} />
                    )}
                  </div>
                  {value.find(s => s.id === streamer.id) && (
                    <Check className="w-4 h-4 text-primary" />
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
