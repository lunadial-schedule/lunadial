"use client"

import * as React from "react"
import { searchStreamers } from "@/app/actions/streamers"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Loader2, X } from "lucide-react"

function useDebounce<T>(value: T, delay: number = 500): T {
  const [debouncedValue, setDebouncedValue] = React.useState<T>(value)
  React.useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])
  return debouncedValue
}

interface StreamerMultiInputProps {
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  inputValue?: string
  onInputChange?: (val: string) => void
}

export function StreamerMultiInput({ value, onChange, placeholder, inputValue: externalInputValue, onInputChange: externalOnInputChange }: StreamerMultiInputProps) {
  const [internalInputValue, setInternalInputValue] = React.useState("")
  const inputValue = externalInputValue !== undefined ? externalInputValue : internalInputValue
  
  const setInputValue = (val: string) => {
    if (externalOnInputChange) {
      externalOnInputChange(val)
    } else {
      setInternalInputValue(val)
    }
  }

  const debouncedValue = useDebounce(inputValue, 300)
  const [results, setResults] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(false)
  const [isOpen, setIsOpen] = React.useState(false)
  const containerRef = React.useRef<HTMLDivElement>(null)

  const searchIdRef = React.useRef(0)

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
    if (isOpen && debouncedValue) {
      performSearch(debouncedValue)
    }
  }, [debouncedValue, isOpen, performSearch])

  const handleAddValue = (streamerName: string) => {
    const trimmed = streamerName.trim()
    if (!trimmed) return
    if (!value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInputValue("")
    setIsOpen(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault()
      handleAddValue(inputValue)
    } else if (e.key === "Backspace" && !inputValue && value.length > 0) {
      onChange(value.slice(0, -1))
    }
  }

  const handleRemove = (streamerToRemove: string) => {
    onChange(value.filter(s => s !== streamerToRemove))
  }

  return (
    <div className="relative w-full" ref={containerRef}>
      <div className="flex flex-wrap items-center gap-2 rounded-lg border border-input bg-transparent px-3 py-2 text-sm shadow-xs transition-colors focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
        {value.map((streamer, idx) => (
          <span key={idx} className="flex items-center gap-1 rounded bg-secondary px-2 py-0.5 text-secondary-foreground font-medium text-xs">
            {streamer}
            <button
              type="button"
              className="rounded-full hover:bg-muted-foreground/20 p-0.5"
              onClick={() => handleRemove(streamer)}
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
            <div className="py-4 px-3 text-sm flex flex-col gap-1 items-start">
              <span className="text-muted-foreground">'{inputValue}' 검색 결과가 없습니다.</span>
              <button 
                type="button"
                className="text-primary font-medium hover:underline mt-1"
                onClick={() => handleAddValue(inputValue)}
              >
                '{inputValue}'(으)로 직접 추가
              </button>
            </div>
          )}

          {!isLoading && results.length > 0 && (
            <ul className="flex flex-col py-1">
              <li className="px-3 pb-1 pt-2 text-xs font-semibold text-muted-foreground">스트리머 목록</li>
              {results.map((streamer) => (
                <li
                  key={streamer.id}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-muted transition-colors"
                  onClick={() => handleAddValue(streamer.name)}
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
