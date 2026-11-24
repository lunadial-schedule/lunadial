export type PlatformType = "chzzk" | "soop" | "youtube" | "twitch"

/**
 * 스트리머의 채널 URL 또는 채널 ID로 방송 플랫폼을 판별한다.
 */
export function detectPlatform(
  channelUrl?: string | null,
  channelId?: string | null
): PlatformType | null {
  const url = (channelUrl || "").toLowerCase()

  if (url.includes("chzzk.naver.com")) return "chzzk"
  if (url.includes("sooplive.co.kr") || url.includes("sooplive.com") || url.includes("afreecatv.com")) {
    return "soop"
  }
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "youtube"
  if (url.includes("twitch.tv")) return "twitch"

  // URL이 없더라도 치지직 channel_id가 있으면 치지직으로 간주
  if (channelId) return "chzzk"

  return null
}

/**
 * 스트리머 방송국(채널 홈) URL을 반환한다.
 */
export function getStreamerChannelUrl(
  channelUrl?: string | null,
  channelId?: string | null
): string | null {
  if (channelUrl && channelUrl.trim().length > 0) {
    return channelUrl.trim()
  }
  if (channelId) {
    return `https://chzzk.naver.com/${channelId}`
  }
  return null
}

/**
 * 스트리머 실시간 라이브 URL을 반환한다.
 */
export function getStreamerLiveUrl(
  channelUrl?: string | null,
  channelId?: string | null
): string | null {
  const platform = detectPlatform(channelUrl, channelId)
  if (platform === "chzzk" && channelId) {
    return `https://chzzk.naver.com/live/${channelId}`
  }
  return getStreamerChannelUrl(channelUrl, channelId)
}

/**
 * 플랫폼 한글 표시명을 반환한다.
 */
export function getPlatformLabel(platform: PlatformType): string {
  switch (platform) {
    case "chzzk":
      return "치지직"
    case "soop":
      return "SOOP"
    case "youtube":
      return "유튜브"
    case "twitch":
      return "트위치"
  }
}
