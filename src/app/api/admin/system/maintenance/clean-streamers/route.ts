import { createAdminClient } from '@/lib/supabase/admin';
import { NextResponse } from 'next/server';
import { normalizeStreamerName } from '@/lib/utils';
import { getChzzkChannels } from '@/services/chzzk';
import { assertAdminOpsAuthorized } from '@/lib/admin-auth';

// 비정상적인 스트리머 이름 패턴 목록 (is_active = false 처리 대상)
const INVALID_NAMES = [
  '방송 예정',
  '미정',
  '추후 공지',
  '업데이트 예정',
  '제목없음',
  '-',
  '.',
  '방송예정'
];

export async function POST(req: Request) {
  // 1. 공통 보호 로직 검사
  const authErrorResponse = assertAdminOpsAuthorized(req);
  if (authErrorResponse) return authErrorResponse;

  // 2. 파라미터 파싱
  const url = new URL(req.url);
  const dryRunParam = url.searchParams.get('dryRun');
  
  let dryRun = false;
  try {
    const body = await req.json().catch(() => ({}));
    dryRun = body.dryRun === true || dryRunParam === 'true';
  } catch (e) {
    dryRun = dryRunParam === 'true';
  }

  const supabase = createAdminClient();

  // 3. 모든 스트리머 가져오기
  const { data: streamers, error: fetchError } = await supabase
    .from('streamers')
    .select('*')
    .eq('is_active', true);

  if (fetchError || !streamers) {
    return NextResponse.json({ success: false, error: fetchError?.message }, { status: 500 });
  }

  const summary = {
    total_processed: streamers.length,
    renamed: 0,
    aliases_updated: 0,
    profile_refreshed: 0,
    deactivated: 0,
    skipped: 0,
    errors: 0
  };

  const preview = {
    would_deactivate: [] as any[],
    would_rename: [] as any[],
    would_add_alias: [] as any[],
    would_refresh_profile: [] as any[],
    would_update_metadata: [] as any[],
    would_skip: [] as any[],
    errors: [] as any[]
  };

  for (const streamer of streamers) {
    try {
      // 비정상적인 이름 비활성화
      const isInvalid = INVALID_NAMES.some(invalid => streamer.name.includes(invalid));
      if (isInvalid) {
        if (!dryRun) {
          await supabase.from('streamers').update({ is_active: false }).eq('id', streamer.id);
        }
        if (preview.would_deactivate.length < 50) {
          preview.would_deactivate.push({ id: streamer.id, name: streamer.name });
        }
        summary.deactivated++;
        continue;
      }

      // channel_id가 있는 스트리머의 공식 정보 동기화
      if (streamer.channel_id) {
        const channels = await getChzzkChannels([streamer.channel_id]);
        if (channels && channels.length > 0) {
          const chzzkChannel = channels[0];
          const actualName = chzzkChannel.channelName;
          const actualNormName = normalizeStreamerName(actualName);
          const expectedChannelUrl = `https://chzzk.naver.com/${chzzkChannel.channelId}`;
          
          const nameChanged = actualName !== streamer.name;
          const metadataChanged = 
            streamer.image_url !== chzzkChannel.channelImageUrl ||
            streamer.follower_count !== chzzkChannel.followerCount ||
            streamer.verified_mark !== chzzkChannel.verifiedMark ||
            streamer.channel_url !== expectedChannelUrl;

          let addedAlias = false;
          const newAliases = Array.isArray(streamer.aliases) ? [...streamer.aliases] : [];
          
          if (nameChanged) {
            const isOldNameGarbage = INVALID_NAMES.some(iv => streamer.name.includes(iv));
            const oldNameNorm = normalizeStreamerName(streamer.name);
            
            if (!isOldNameGarbage && oldNameNorm !== actualNormName) {
              newAliases.push(streamer.name);
              addedAlias = true;
            }
          }

          // 4. aliases 정리 강화: 기존 alias들도 동일한 로직으로 정리
          const rawAliases = newAliases.filter(a => typeof a === 'string' && a.trim().length > 0);
          const cleanedAliases: string[] = [];
          const seenNorm = new Set<string>([actualNormName]); // 본명 중복 제거
          
          for (const a of rawAliases) {
            const norm = normalizeStreamerName(a);
            if (norm && !seenNorm.has(norm)) {
              cleanedAliases.push(a);
              seenNorm.add(norm);
            }
          }
          
          // 기존 aliases가 지나치게 길어지지 않도록 방어 로직 (최대 10개)
          if (cleanedAliases.length > 10) {
             cleanedAliases.splice(10);
          }
          
          const aliasesModified = JSON.stringify(cleanedAliases) !== JSON.stringify(Array.isArray(streamer.aliases) ? streamer.aliases : []);

          if (nameChanged || metadataChanged || aliasesModified) {
            const newNormalizedAliases = cleanedAliases.map(a => normalizeStreamerName(a)).filter(Boolean);

            if (!dryRun) {
              const { error: updateError } = await supabase
                .from('streamers')
                .update({
                  name: actualName,
                  normalized_name: actualNormName,
                  aliases: cleanedAliases,
                  normalized_aliases: newNormalizedAliases,
                  image_url: chzzkChannel.channelImageUrl,
                  channel_url: expectedChannelUrl,
                  follower_count: chzzkChannel.followerCount,
                  verified_mark: chzzkChannel.verifiedMark,
                  source_type: 'api_verified',
                  updated_at: new Date().toISOString()
                })
                .eq('id', streamer.id);

              if (updateError) {
                if (preview.errors.length < 50) preview.errors.push(`Failed to update ${streamer.name}: ${updateError.message}`);
                summary.errors++;
                continue;
              }
            }

            const itemInfo = {
               id: streamer.id,
               current_name: streamer.name,
               actual_name: actualName,
               current_image_url: streamer.image_url,
               new_image_url: chzzkChannel.channelImageUrl,
               current_follower_count: streamer.follower_count,
               new_follower_count: chzzkChannel.followerCount,
               current_verified_mark: streamer.verified_mark,
               new_verified_mark: chzzkChannel.verifiedMark
            };

            if (nameChanged) {
              summary.renamed++;
              if (preview.would_rename.length < 50) {
                preview.would_rename.push(itemInfo);
              }
              if (addedAlias && preview.would_add_alias.length < 50) {
                preview.would_add_alias.push({ id: streamer.id, previous_name_to_alias: streamer.name });
              }
            } else if (metadataChanged) {
              summary.profile_refreshed++;
              if (preview.would_refresh_profile.length < 50) {
                preview.would_refresh_profile.push(itemInfo);
              }
            } else if (aliasesModified) {
              summary.aliases_updated++;
              if (preview.would_update_metadata.length < 50) {
                preview.would_update_metadata.push({ id: streamer.id, actual_name: actualName, reason: "aliases cleaned" });
              }
            }
          } else {
            // 이름과 프로필 모두 동일한 경우
            summary.skipped++;
            if (preview.would_skip.length < 50) {
              preview.would_skip.push({ id: streamer.id, reason: 'Profile is up to date' });
            }
          }
        } else {
          // 채널 정보 찾을 수 없음
          summary.skipped++;
        }
      } else {
        // 채널 ID 없음
        summary.skipped++;
      }
    } catch (e: any) {
      if (preview.errors.length < 50) preview.errors.push(`Exception processing ${streamer.name}: ${e.message}`);
      summary.errors++;
    }
  }

  return NextResponse.json({
    success: true,
    mode: dryRun ? "dry-run" : "execution",
    message: dryRun ? "Cleanup preview completed" : "Cleanup successfully executed",
    summary,
    preview
  });
}
