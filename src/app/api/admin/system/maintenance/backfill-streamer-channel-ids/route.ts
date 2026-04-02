import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { normalizeStreamerName } from '@/lib/utils';
import { assertAdminOpsAuthorized } from '@/lib/admin-auth';
import { searchStreamerChannels, ChzzkSearchChannelResult } from '@/services/admin/chzzk-search';

// 명백한 오염 이름 후보 (기존 닉네임을 aliases로 옮길 때 배제하기 위함)
const INVALID_NAMES = ['방송 예정', '미정', '추후 공지', '업데이트 예정', '제목없음', '-', '.', '방송예정'];

export async function POST(req: Request) {
  // 1. 공통 보호 로직 검사
  const authErrorResponse = assertAdminOpsAuthorized(req);
  if (authErrorResponse) return authErrorResponse;

  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get('dryRun');
  const limitParam = url.searchParams.get('limit');
  const offsetParam = url.searchParams.get('offset');
  const minConfidenceParam = url.searchParams.get('minConfidence');
  const onlyNullChannelIdParam = url.searchParams.get('onlyNullChannelId');
  
  let dryRun = dryRunParam === 'true';
  let limit = limitParam ? parseInt(limitParam, 10) : 100;
  if (isNaN(limit) || limit <= 0) limit = 100;

  let offset = offsetParam ? parseInt(offsetParam, 10) : 0;
  if (isNaN(offset) || offset < 0) offset = 0;
  
  let minConfidence = minConfidenceParam ? parseFloat(minConfidenceParam) : 0.9;
  if (isNaN(minConfidence) || minConfidence < 0 || minConfidence > 1) minConfidence = 0.9;

  let onlyNullChannelId = onlyNullChannelIdParam !== 'false';

  try {
    const body = await req.json().catch(() => ({}));
    if (body.dryRun !== undefined) dryRun = body.dryRun;
    if (body.limit !== undefined) limit = body.limit;
    if (body.offset !== undefined) offset = body.offset;
    if (body.minConfidence !== undefined) minConfidence = body.minConfidence;
    if (body.onlyNullChannelId !== undefined) onlyNullChannelId = body.onlyNullChannelId;
  } catch (e) {
    //
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const isUsingServiceRole = !!(process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY);
  console.log(`[backfill-streamer-channel-ids] using service role admin client=${isUsingServiceRole}`);
  console.log(`[backfill-streamer-channel-ids] Supabase URL starts with=${supabaseUrl.substring(0, 15)}...`);
  console.log(`[backfill-streamer-channel-ids] onlyNullChannelId=${onlyNullChannelId}, limit=${limit}, offset=${offset}, dryRun=${dryRun}, minConfidence=${minConfidence}`);

  const supabase = createAdminClient();

  // 대상 데이터 쿼리
  let query = supabase
    .from('streamers')
    .select('*')
    .eq('is_active', true)
    .range(offset, offset + limit - 1)
    .order('created_at', { ascending: true });

  if (onlyNullChannelId) {
    query = query.is('channel_id', null);
  }

  const { data: streamers, error: fetchError } = await query;

  if (fetchError || !streamers) {
    return NextResponse.json({ success: false, error: fetchError?.message }, { status: 500 });
  }

  console.log(`[backfill-streamer-channel-ids] fetched streamers count=${streamers.length}`);

  const summary = {
    total_candidates: streamers.length,
    search_success: 0,
    auto_matchable: 0,
    needs_review: 0,
    no_match: 0,
    updated: 0,
    skipped: 0,
    errors: 0
  };

  const preview = {
    would_update: [] as any[],
    needs_review: [] as any[],
    no_match: [] as any[],
    errors: [] as any[],
    updated_items: [] as any[] // execute 시 결과 노출용
  };

  for (const streamer of streamers) {
    try {
      // 1. 치지직 채널 검색 (최상위 후보 여러 개)
      const candidates = await searchStreamerChannels(streamer.name, 5);
      
      if (!candidates || candidates.length === 0) {
        summary.no_match++;
        if (preview.no_match.length < 50) preview.no_match.push({ id: streamer.id, name: streamer.name, reason: "No search results" });
        continue;
      }
      
      summary.search_success++;

      // 2. 최고 적합 후보 도출 로직 Scoring (Max 1.0)
      let bestCandidate: ChzzkSearchChannelResult | null = null;
      let bestScore = -1;

      for (const c of candidates) {
        let score = 0;
        const normC = normalizeStreamerName(c.channelName);
        const normS = normalizeStreamerName(streamer.name);
        
        // 이름 유사도 평가
        if (c.channelName === streamer.name) {
          score = 1.0;
        } else if (normC === normS) {
          score = 0.95;
        } else if (normC.includes(normS) || normS.includes(normC)) {
          score = 0.7; // 부분 일치
        } else if (Array.isArray(streamer.aliases) && streamer.aliases.some((a: string) => normalizeStreamerName(a) === normC)) {
          score = 0.85; // 과거 별칭(alias)과 일치
        } else {
          score = 0.4; // 검색 결과로 나오긴 했으나 매칭이 애매함
        }

        // 보조 가중치: 팔로워 수 (최대 +0.02) 및 공식 마크 (+0.03)
        const followerBonus = Math.min((c.followerCount / 50000) * 0.02, 0.02);
        score += followerBonus;
        if (c.verifiedMark) score += 0.03;

        // 점수 교정 (최대 1.0 초과 방지)
        score = Math.min(score, 1.0);

        if (score > bestScore) {
          bestScore = score;
          bestCandidate = c;
        }
      }

      const match = bestCandidate!;
      let action = 'needs_review';
      if (bestScore >= minConfidence) {
        action = 'would_update';
        summary.auto_matchable++;
      } else {
        summary.needs_review++;
      }

      // alias 추가 로직 (기존 이름이 유의미한지 평가)
      const currentNorm = normalizeStreamerName(streamer.name);
      const matchNorm = normalizeStreamerName(match.channelName);
      let aliasToAdd: string | null = null;
      
      const isExistingNameGarbage = INVALID_NAMES.some(iv => streamer.name.includes(iv));
      if (!isExistingNameGarbage && currentNorm !== matchNorm) {
        aliasToAdd = streamer.name;
      }

      // Preview 항목 생성
      const currentAliases = Array.isArray(streamer.aliases) ? (streamer.aliases as string[]) : [];
      const itemInfo = {
        streamer_id: streamer.id,
        current_name: streamer.name,
        matched_channel_name: match.channelName,
        matched_channel_id: match.channelId,
        current_aliases: currentAliases,
        alias_to_add: aliasToAdd,
        follower_count: match.followerCount,
        verified_mark: match.verifiedMark,
        confidence: Number(bestScore.toFixed(3)),
        action
      };

      if (action === 'would_update') {
        if (preview.would_update.length < 50) preview.would_update.push(itemInfo);
        
        // 실제 업데이트 수행
        if (!dryRun) {
          const newAliasesSet = new Set(currentAliases);
          if (aliasToAdd) newAliasesSet.add(aliasToAdd);
          newAliasesSet.delete(match.channelName); // 새 이름과 동일한 값은 alias에서 삭제

          const newAliases = Array.from(newAliasesSet);
          const newNormalizedAliases = Array.from(new Set(newAliases.map((a: string) => normalizeStreamerName(a)).filter(Boolean)));

          const { error: updateError } = await supabase
            .from('streamers')
            .update({
              channel_id: match.channelId,
              name: match.channelName,
              normalized_name: matchNorm,
              aliases: newAliases,
              normalized_aliases: newNormalizedAliases,
              channel_url: `https://chzzk.naver.com/${match.channelId}`,
              image_url: match.channelImageUrl,
              follower_count: match.followerCount,
              verified_mark: match.verifiedMark,
              source_type: 'api_verified',
              updated_at: new Date().toISOString()
            })
            .eq('id', streamer.id);

          if (updateError) {
            summary.errors++;
            if (preview.errors.length < 50) preview.errors.push(`Update error for ${streamer.name}: ${updateError.message}`);
          } else {
            summary.updated++;
            if (preview.updated_items.length < 50) preview.updated_items.push(itemInfo);
          }
        }
      } else {
        if (preview.needs_review.length < 50) preview.needs_review.push(itemInfo);
        summary.skipped++;
      }

    } catch (err: any) {
      summary.errors++;
      if (preview.errors.length < 50) preview.errors.push(`Error processing ${streamer.name}: ${err.message}`);
    }
  }

  // 응답 반환 시 dryRun 모드가 아닐 경우 would_update 필드는 숨겨서 결과 크기 최적화
  const finalPreview = {
    ...(dryRun ? { would_update: preview.would_update } : { updated_items: preview.updated_items }),
    needs_review: preview.needs_review,
    no_match: preview.no_match,
    errors: preview.errors
  };

  return NextResponse.json({
    success: true,
    mode: dryRun ? "dry-run" : "execution",
    message: dryRun ? "Backfill preview completed" : "Backfill execution completed",
    summary,
    preview: finalPreview
  });
}
