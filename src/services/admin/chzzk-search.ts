/**
 * 치지직 채널 검색 Provider 레이어 (추후 교체 가능)
 */
export interface ChzzkSearchChannelResult {
  channelId: string;
  channelName: string;
  channelImageUrl: string;
  verifiedMark: boolean;
  followerCount: number;
  channelUrl?: string;
  profileHydrated?: boolean;
  followerCountSource?: 'live_seed' | 'channel_detail' | 'unknown';
}

export async function searchStreamerChannels(query: string, size: number = 3): Promise<ChzzkSearchChannelResult[]> {
  if (!query) return [];

  try {
    // 치지직 내부 검색 API 사용 (비공식 엔드포인트이므로 구조/스펙 변경 시 모듈만 이 부분에서 대응)
    const url = `https://api.chzzk.naver.com/service/v1/search/channels?keyword=${encodeURIComponent(query)}&size=${size}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      console.warn(`Chzzk Search API Error: ${response.status}`);
      return [];
    }

    const json = await response.json();
    if (json.code === 200 && json.content?.data) {
      return json.content.data.map((item: any) => {
        const c = item.channel;
        return {
          channelId: c.channelId,
          channelName: c.channelName,
          channelImageUrl: c.channelImageUrl,
          verifiedMark: c.verifiedMark === true,
          followerCount: typeof c.followerCount === 'number' ? c.followerCount : 0
        };
      });
    }
  } catch (error) {
    console.error('Failed to search Chzzk channels for:', query, error);
  }
  return [];
}

import { getChzzkChannels } from '@/services/chzzk';

export interface FetchTopChannelsResult {
  providerMode: 'real' | 'mock';
  channels: ChzzkSearchChannelResult[];
  note?: string;
  stats?: {
    seedCount: number;
    detailSuccessCount: number;
    followerCountSuccess: number;
    followerCountUnknown: number;
  };
}

export async function fetchTopChzzkChannels(limit: number = 50, minFollowers: number = 1000): Promise<FetchTopChannelsResult> {
  const seedChannels: Record<string, ChzzkSearchChannelResult> = {};
  const orderedIds: string[] = [];
  let hasMore = true;
  let page = 0;
  let nextConcurrentParams = '';

  // 1. Seed Gathering (Lives API)
  const maxSeeds = Math.min(limit * 2, 5000); // Get more seeds to account for drops
  try {
    while (hasMore && orderedIds.length < maxSeeds && page < 20) {
      const url = `https://api.chzzk.naver.com/service/v1/lives?size=50&sortType=POPULAR${nextConcurrentParams ? '&' + nextConcurrentParams : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      if (!response.ok) break;

      const json = await response.json();
      if (json.code !== 200 || !json.content?.data) break;

      const list = json.content.data;
      if (list.length === 0) {
         hasMore = false;
         break;
      }

      for (const item of list) {
         const channelId = item.channel?.channelId;
         if (!channelId || seedChannels[channelId]) continue;
         
         const fc = typeof item.channel?.followerCount === 'number' ? item.channel.followerCount : 0;
         
         seedChannels[channelId] = {
           channelId: channelId,
           channelName: item.channel?.channelName || 'Unknown',
           channelImageUrl: item.channel?.channelImageUrl || '',
           verifiedMark: item.channel?.verifiedMark === true,
           followerCount: fc,
           followerCountSource: fc > 0 ? 'live_seed' : 'unknown',
           profileHydrated: false,
         };
         orderedIds.push(channelId);
      }

      page++;
      const pageInfo = json.content.page;
      if (pageInfo && pageInfo.next) {
         nextConcurrentParams = Object.keys(pageInfo.next)
            .map(k => `${k}=${encodeURIComponent(pageInfo.next[k])}`)
            .join('&');
      } else {
         hasMore = false;
      }
      
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (error) {
    console.error('Failed to gather seeds:', error);
  }

  // 2. Hydration (Channel Detail API)
  const result: ChzzkSearchChannelResult[] = [];
  const stats = {
    seedCount: orderedIds.length,
    detailSuccessCount: 0,
    followerCountSuccess: 0,
    followerCountUnknown: 0
  };

  // We only hydrate up to limits + some buffer since many could be dropped
  for (let i = 0; i < orderedIds.length; i += 20) {
    if (result.length >= limit) break; // We got enough hydrated channels

    const chunkIds = orderedIds.slice(i, i + 20);
    const details = await getChzzkChannels(chunkIds);
    
    const detailsMap = new Map();
    for (const d of details) {
      detailsMap.set(d.channelId, d);
    }

    for (const cid of chunkIds) {
      const seed = seedChannels[cid];
      const hydrated = detailsMap.get(cid);
      
      if (hydrated) {
        stats.detailSuccessCount++;
        seed.channelName = hydrated.channelName;
        seed.channelImageUrl = hydrated.channelImageUrl;
        seed.verifiedMark = hydrated.verifiedMark;
        seed.profileHydrated = true;
        
        if (typeof hydrated.followerCount === 'number' && hydrated.followerCount > 0) {
           seed.followerCount = hydrated.followerCount;
           seed.followerCountSource = 'channel_detail';
           stats.followerCountSuccess++;
        } else {
           if (seed.followerCount === 0) seed.followerCountSource = 'unknown';
           else stats.followerCountSuccess++; // retained from seed
        }
      }

      if (seed.followerCount === 0) {
         stats.followerCountUnknown++;
      }

      // Add actual channel URL
      seed.channelUrl = `https://chzzk.naver.com/${cid}`;
      
      result.push(seed);
    }

    // sleep between batches
    if (i + 20 < orderedIds.length && result.length < limit) {
      await new Promise(r => setTimeout(r, 150));
    }
  }

  const outputChannels = result.slice(0, limit);
  return {
    providerMode: 'real',
    channels: outputChannels,
    stats,
    note: orderedIds.length === 0 ? "씨앗 채널 수집 실패" : `총 ${stats.seedCount}개 Seed 수집 중 ${outputChannels.length}개 반환 처리 (조회 성공: ${stats.detailSuccessCount})`
  };
}
