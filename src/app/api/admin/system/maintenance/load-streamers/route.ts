import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { normalizeStreamerName } from '@/lib/utils';
import { assertAdminOpsAuthorized } from '@/lib/admin-auth';
import { fetchTopChzzkChannels } from '@/services/admin/chzzk-search';

// 비정상적인 스트리머 이름 패턴
const INVALID_NAMES = ['방송 예정', '미정', '추후 공지', '업데이트 예정', '제목없음', '-', '.', '방송예정'];

export async function POST(req: Request) {
  // 1. 공통 보호 로직 검사
  const authErrorResponse = await assertAdminOpsAuthorized(req);
  if (authErrorResponse) return authErrorResponse;

  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get('dryRun');
  const limitParam = url.searchParams.get('limit');
  const minFollowersParam = url.searchParams.get('minFollowers');
  
  let dryRun = dryRunParam === 'true';
  let limit = limitParam ? parseInt(limitParam, 10) : 50;
  if (isNaN(limit) || limit <= 0) limit = 50;
  
  let minFollowers = minFollowersParam ? parseInt(minFollowersParam, 10) : 5000;
  if (isNaN(minFollowers) || minFollowers < 0) minFollowers = 5000;

  try {
    const body = await req.json().catch(() => ({}));
    if (body.dryRun !== undefined) dryRun = body.dryRun;
    if (body.limit !== undefined) limit = body.limit;
    if (body.minFollowers !== undefined) minFollowers = body.minFollowers;
  } catch (e) {
    // query param 우선순위 유지
  }

  const supabase = createAdminClient();

  // 실제 데이터 소스(Provider) 연동
  const { providerMode, channels: fetchedChannels, note: providerNote, stats: providerStats } = await fetchTopChzzkChannels(limit, minFollowers);

  const summary = {
    provider_mode: providerMode,
    seed_count: providerStats?.seedCount || 0,
    profile_hydrated_count: providerStats?.detailSuccessCount || 0,
    unknown_follower_count: providerStats?.followerCountUnknown || 0,
    fetched_count: fetchedChannels.length,
    filtered_low_followers: 0,
    filtered_unknown_followers: 0,
    upserted_count: 0,
    unchanged_count: 0,
    errors: 0
  };

  const preview = {
    would_insert: [] as any[],
    would_update: [] as any[],
    would_skip: [] as any[],
    errors: [] as string[]
  };

  const channelIds = fetchedChannels.map(c => c.channelId);
  if (channelIds.length === 0) {
     return NextResponse.json({ success: true, message: "No channels fetched", summary, preview });
  }

  // URI 길이가 너무 길어지는 것(16KB 이상)을 방지하기 위해 100개씩 Chunk
  let existingStreamers: any[] = [];
  for (let i = 0; i < channelIds.length; i += 100) {
    const chunkIds = channelIds.slice(i, i + 100);
    const { data, error } = await supabase
      .from('streamers')
      .select('id, channel_id, name, aliases, image_url, follower_count, verified_mark')
      .in('channel_id', chunkIds);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
    if (data) existingStreamers.push(...data);
  }

  const existingMap = new Map();
  if (existingStreamers) {
    for (const streamer of existingStreamers) {
      existingMap.set(streamer.channel_id, streamer);
    }
  }

  const batchUpserts: any[] = [];
  for (const ch of fetchedChannels) {
    try {
      if (ch.followerCount === 0 && ch.followerCountSource === 'unknown') {
        summary.filtered_unknown_followers++;
        continue;
      }
      if (ch.followerCount < minFollowers) {
        summary.filtered_low_followers++;
        continue;
      }

      const normalizedName = normalizeStreamerName(ch.channelName);
      const expectedChannelUrl = ch.channelUrl || `https://chzzk.naver.com/${ch.channelId}`;
      const existing = existingMap.get(ch.channelId);
      
      let finalAliases: string[] = [];
      let finalNormalizedAliases: string[] = [];
      let wouldUpdateFields: string[] = [];

      if (existing) {
        // 기존 정보 병합 로직
        const oldAliases = Array.isArray(existing.aliases) ? existing.aliases : [];
        const rawAliases = [...oldAliases];

        if (existing.name && normalizeStreamerName(existing.name) !== normalizedName) {
           const isOldNameGarbage = INVALID_NAMES.some(iv => existing.name.includes(iv));
           if (!isOldNameGarbage) {
             rawAliases.push(existing.name);
           }
        }
        
        const validRawAliases = rawAliases.filter(a => typeof a === 'string' && a.trim().length > 0 && a !== ch.channelName);
        const cleanedAliases: string[] = [];
        const seenNorm = new Set<string>([normalizedName]);
        
        for (const a of validRawAliases) {
            const norm = normalizeStreamerName(a);
            if (norm && !seenNorm.has(norm)) {
              cleanedAliases.push(a);
              seenNorm.add(norm);
            }
        }
        
        if (cleanedAliases.length > 10) {
            cleanedAliases.splice(10);
        }
        
        finalAliases = cleanedAliases;
        finalNormalizedAliases = cleanedAliases.map(a => normalizeStreamerName(a)).filter(Boolean);

        // 변경점 감지
        if (existing.name !== ch.channelName) wouldUpdateFields.push('name');
        if (existing.image_url !== ch.channelImageUrl) wouldUpdateFields.push('image_url');
        if (existing.follower_count !== ch.followerCount) wouldUpdateFields.push('follower_count');
        if (existing.verified_mark !== ch.verifiedMark) wouldUpdateFields.push('verified_mark');
        // channel_url doesn't exist on select, but we always upsert it.
        // If aliases changed
        if (JSON.stringify(oldAliases) !== JSON.stringify(finalAliases)) wouldUpdateFields.push('aliases');
      }

      if (existing && wouldUpdateFields.length === 0) {
        summary.unchanged_count++;
        if (preview.would_skip.length < 50) {
          preview.would_skip.push({ channel_id: ch.channelId, reason: 'No fields to update' });
        }
        continue;
      }

      const upsertPayload = {
        channel_id: ch.channelId,
        name: ch.channelName,
        normalized_name: normalizedName,
        image_url: ch.channelImageUrl,
        channel_url: expectedChannelUrl,
        follower_count: ch.followerCount,
        verified_mark: ch.verifiedMark,
        source_type: 'api_verified',
        is_active: true,
        ...(existing && { aliases: finalAliases, normalized_aliases: finalNormalizedAliases }),
        updated_at: new Date().toISOString()
      };

      batchUpserts.push(upsertPayload);

      const previewItem = {
         channel_id: ch.channelId,
         name: ch.channelName,
         channel_url: expectedChannelUrl,
         follower_count: ch.followerCount,
         verified_mark: ch.verifiedMark,
         follower_count_source: ch.followerCountSource || 'unknown',
         profile_hydrated: !!ch.profileHydrated
      };

      if (existing) {
        summary.upserted_count++;
        if (preview.would_update.length < 50) {
           preview.would_update.push({
             ...previewItem,
             from_name: existing.name,
             to_name: ch.channelName,
             merged_aliases: finalAliases,
             would_update_fields: wouldUpdateFields
           });
        }
      } else {
        summary.upserted_count++;
        if (preview.would_insert.length < 50) {
           preview.would_insert.push(previewItem);
        }
      }
    } catch (e: any) {
      summary.errors++;
      if (preview.errors.length < 50) preview.errors.push(`Exception processing ${ch.channelName}: ${e.message}`);
    }
  }

  // 일괄 Upsert 실행 (성능 확보 및 타임아웃 방지)
  if (!dryRun && batchUpserts.length > 0) {
    for (let i = 0; i < batchUpserts.length; i += 100) {
      const chunk = batchUpserts.slice(i, i + 100);
      const { error: upsertError } = await supabase
        .from('streamers')
        .upsert(chunk, { onConflict: 'channel_id' });

      if (upsertError) {
        console.error("Batch upsert error:", upsertError);
        preview.errors.push(`Failed to batch upsert chunk: ${upsertError.message}`);
        // 실제 실패한 갯수만큼 보정
        summary.errors += chunk.length;
        summary.upserted_count -= chunk.length;
      }
    }
  }

  return NextResponse.json({
    success: true,
    mode: dryRun ? "dry-run" : "execution",
    message: dryRun ? "Load streamers preview completed" : "Master data loading completed",
    summary,
    preview,
    note: providerNote || (providerMode === 'mock' 
      ? "주의: 현재 수집 모듈(Provider)은 Mock 형태입니다. 실제 치지직 랭킹 API 연동 코드로 교체해야 실제 데이터가 적재/확장됩니다." 
      : "실제 치지직 API(채널/라이브) 데이터를 기반으로 정상 수집/확장되었습니다.")
  });
}
