import { type NextRequest, NextResponse } from "next/server"

export const dynamic = "force-dynamic"

const CACHE_TTL_MS = 30 * 1000
const MAX_CHANNEL_IDS = 100
const CONCURRENCY_LIMIT = 10

interface CachedLiveStatus {
  isLive: boolean
  expiresAt: number
}

const liveStatusCache = new Map<string, CachedLiveStatus>()
const inFlightChecks = new Map<string, Promise<boolean>>()

async function fetchSingleChannelLiveStatus(channelId: string): Promise<boolean> {
  const now = Date.now()
  const cached = liveStatusCache.get(channelId)
  if (cached && cached.expiresAt > now) {
    return cached.isLive
  }

  const existingPromise = inFlightChecks.get(channelId)
  if (existingPromise) {
    return existingPromise
  }

  const promise = (async () => {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 3000)

    try {
      const res = await fetch(
        `https://api.chzzk.naver.com/polling/v2/channels/${encodeURIComponent(channelId)}/live-status`,
        {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
          },
          cache: "no-store",
          signal: controller.signal,
        }
      )

      if (!res.ok) {
        return false
      }

      const json = await res.json()
      const isLive = json?.code === 200 && json?.content?.status === "OPEN"

      liveStatusCache.set(channelId, {
        isLive,
        expiresAt: Date.now() + CACHE_TTL_MS,
      })

      return isLive
    } catch {
      return false
    } finally {
      clearTimeout(timeout)
      inFlightChecks.delete(channelId)
    }
  })()

  inFlightChecks.set(channelId, promise)
  return promise
}

async function resolveLiveStatuses(channelIds: string[]): Promise<Record<string, boolean>> {
  const uniqueIds = Array.from(
    new Set(
      channelIds
        .map((id) => (typeof id === "string" ? id.trim() : ""))
        .filter((id) => /^[a-zA-Z0-9_-]{8,64}$/.test(id))
    )
  ).slice(0, MAX_CHANNEL_IDS)

  const liveMap: Record<string, boolean> = {}

  for (let i = 0; i < uniqueIds.length; i += CONCURRENCY_LIMIT) {
    const batch = uniqueIds.slice(i, i + CONCURRENCY_LIMIT)
    const results = await Promise.all(
      batch.map(async (id) => ({ id, isLive: await fetchSingleChannelLiveStatus(id) }))
    )
    for (const { id, isLive } of results) {
      liveMap[id] = isLive
    }
  }

  return liveMap
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const channelIds = Array.isArray(body?.channelIds) ? body.channelIds : []
    const liveMap = await resolveLiveStatuses(channelIds)
    const liveChannelIds = Object.entries(liveMap)
      .filter(([, isLive]) => isLive)
      .map(([id]) => id)

    return NextResponse.json(
      {
        liveChannelIds,
        liveMap,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("라이브 상태 조회 실패:", error)
    return NextResponse.json(
      { error: "라이브 상태를 조회하지 못했습니다.", liveChannelIds: [], liveMap: {} },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  }
}

export async function GET(req: NextRequest) {
  try {
    const raw = req.nextUrl.searchParams.get("channelIds") || ""
    const channelIds = raw ? raw.split(",") : []
    const liveMap = await resolveLiveStatuses(channelIds)
    const liveChannelIds = Object.entries(liveMap)
      .filter(([, isLive]) => isLive)
      .map(([id]) => id)

    return NextResponse.json(
      {
        liveChannelIds,
        liveMap,
        updatedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store, max-age=0",
        },
      }
    )
  } catch (error) {
    console.error("라이브 상태 조회 실패:", error)
    return NextResponse.json(
      { error: "라이브 상태를 조회하지 못했습니다.", liveChannelIds: [], liveMap: {} },
      { status: 500, headers: { "Cache-Control": "no-store, max-age=0" } }
    )
  }
}
