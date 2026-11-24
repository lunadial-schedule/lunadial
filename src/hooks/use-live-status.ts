"use client"

import * as React from "react"

const CLIENT_CACHE_TTL_MS = 30 * 1000

interface ClientCacheEntry {
  isLive: boolean
  expiresAt: number
}

// 대시보드 내 여러 카드(오늘의 일정, 곧 시작, 상세 드로어)가 동일 채널을 중복 조회하지 않도록 모듈 단위 캐시 공유
const clientLiveCache = new Map<string, ClientCacheEntry>()
const clientInFlight = new Map<string, Promise<Record<string, boolean>>>()

async function fetchLiveStatuses(channelIds: string[]): Promise<Record<string, boolean>> {
  if (channelIds.length === 0) return {}

  const key = [...channelIds].sort().join(",")
  const existing = clientInFlight.get(key)
  if (existing) return existing

  const promise = (async () => {
    try {
      const res = await fetch("/api/chzzk/live/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channelIds }),
        cache: "no-store",
      })
      if (!res.ok) return {}
      const data = await res.json()
      const liveMap: Record<string, boolean> = data?.liveMap || {}
      const expiresAt = Date.now() + CLIENT_CACHE_TTL_MS
      for (const id of channelIds) {
        clientLiveCache.set(id, {
          isLive: Boolean(liveMap[id]),
          expiresAt,
        })
      }
      return liveMap
    } catch {
      return {}
    } finally {
      clientInFlight.delete(key)
    }
  })()

  clientInFlight.set(key, promise)
  return promise
}

export function useLiveStatus(channelIds: (string | null | undefined)[], enabled = true) {
  const uniqueIdsKey = React.useMemo(() => {
    if (!enabled) return ""
    const set = new Set<string>()
    for (const id of channelIds) {
      if (id && id.trim().length > 0) set.add(id.trim())
    }
    return Array.from(set).sort().join(",")
  }, [channelIds, enabled])

  const [liveMap, setLiveMap] = React.useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {}
    if (!uniqueIdsKey) return initial
    const now = Date.now()
    for (const id of uniqueIdsKey.split(",")) {
      const cached = clientLiveCache.get(id)
      if (cached && cached.expiresAt > now) {
        initial[id] = cached.isLive
      }
    }
    return initial
  })

  React.useEffect(() => {
    if (!enabled || !uniqueIdsKey) return

    let cancelled = false
    const ids = uniqueIdsKey.split(",")
    const now = Date.now()
    const uncachedIds: string[] = []
    const cachedSnapshot: Record<string, boolean> = {}

    for (const id of ids) {
      const cached = clientLiveCache.get(id)
      if (cached && cached.expiresAt > now) {
        cachedSnapshot[id] = cached.isLive
      } else {
        uncachedIds.push(id)
      }
    }

    if (Object.keys(cachedSnapshot).length > 0) {
      setLiveMap((prev) => ({ ...prev, ...cachedSnapshot }))
    }

    if (uncachedIds.length === 0) return

    fetchLiveStatuses(uncachedIds).then((fetched) => {
      if (cancelled) return
      setLiveMap((prev) => ({ ...prev, ...fetched }))
    })

    return () => {
      cancelled = true
    }
  }, [uniqueIdsKey, enabled])

  const isChannelLive = React.useCallback(
    (channelId?: string | null) => {
      if (!channelId) return false
      return Boolean(liveMap[channelId])
    },
    [liveMap]
  )

  return { liveMap, isChannelLive }
}
