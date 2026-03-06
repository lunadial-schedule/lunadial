import { createClient } from '@/lib/supabase/server'
import { ensureStreamerExists } from './streamer'
import { checkLinkAccessibility } from '@/lib/link-validator'
import { RATE_LIMIT } from '@/config/env'

export type ScheduleCategory = '컨텐츠' | '합방' | '대회' | '기타'
export type ScheduleStatus = 'confirmed' | 'changed' | 'canceled'
export type LinkCheckStatus = 'ok' | 'failed' | 'unknown'

export interface CreateScheduleInput {
  streamerId: string
  title: string
  description?: string
  startAt: string // ISO
  endAt?: string // ISO
  category: ScheduleCategory
  sourceUrl: string
}

export async function createSchedule(input: CreateScheduleInput) {
  const supabase = await createClient()

  // 1. 유저 인증
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  // 2. 레이트 리밋 검증 (일 30회)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count } = await supabase
    .from('schedules')
    .select('*', { count: 'exact', head: true })
    .eq('created_by', user.id)
    .gte('created_at', today.toISOString())

  if (count !== null && count >= RATE_LIMIT.SCHEDULE_CREATE) {
    throw new Error('오늘 가능한 일정 추가 횟수(30회)를 초과했어요. 내일 다시 시도해 주세요.')
  }

  // 3. 스트리머 존재 보장
  await ensureStreamerExists(input.streamerId)

  // 4. 링크 검증
  const linkCheckStatus = await checkLinkAccessibility(input.sourceUrl)

  // 5. 생성 (중복 판별은 클라이언트 단에서 Warning용으로만 사용하거나 향후 확장)
  const { data: newSchedule, error } = await supabase
    .from('schedules')
    .insert({
      streamer_id: input.streamerId,
      title: input.title,
      description: input.description,
      start_at: input.startAt,
      end_at: input.endAt,
      category: input.category,
      source_url: input.sourceUrl,
      created_by: user.id,
      link_check_status: linkCheckStatus
    })
    .select()
    .single()

  if (error || !newSchedule) {
    console.error('Create Schedule Error:', error)
    throw new Error('일정 생성에 실패했습니다.')
  }

  // 6. 이력 테이블(Revision)에 초기 스냅샷 저장
  await supabase.from('schedule_revisions').insert({
    schedule_id: newSchedule.id,
    diff: { action: 'created', initial_state: newSchedule },
    snapshot: newSchedule,
    edited_by: user.id,
    reason: 'Initial creation'
  })

  return newSchedule
}

export async function getSchedules(startDate: string, endDate: string, streamerId?: string) {
  const supabase = await createClient()
  let query = supabase
    .from('schedules')
    .select('*, streamers(*)')
    .gte('start_at', startDate)
    .lte('start_at', endDate)
    .order('start_at', { ascending: true })

  if (streamerId) {
    query = query.eq('streamer_id', streamerId)
  }

  const { data, error } = await query
  if (error) throw new Error('일정 목록을 가져오지 못했습니다.')
  return data
}

export async function checkDuplicate(streamerId: string, startAt: string, titleToken: string) {
  const supabase = await createClient()
  const start = new Date(startAt)
  // ±2 hours heuristic for dupe check
  const fromObj = new Date(start.getTime() - 2 * 60 * 60 * 1000)
  const toObj = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  // We fetch candidates within the time range for the same streamer
  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('streamer_id', streamerId)
    .gte('start_at', fromObj.toISOString())
    .lte('start_at', toObj.toISOString())

  if (error || !data) return []

  // Simple token matching in JS
  return data.filter(s => s.title.includes(titleToken) || titleToken.includes(s.title))
}

export async function updateSchedule(id: string, input: Partial<CreateScheduleInput>, reason: string) {
  const supabase = await createClient()
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  // 1. 레이트 리밋 검증 (일 30회)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  
  const { count } = await supabase
    .from('schedule_revisions')
    .select('*', { count: 'exact', head: true })
    .eq('edited_by', user.id)
    .gte('created_at', today.toISOString())

  if (count !== null && count >= RATE_LIMIT.SCHEDULE_UPDATE) {
    throw new Error('오늘 가능한 일정 수정 횟수(30회)를 초과했어요. 내일 다시 시도해 주세요.')
  }

  // 2. 현재 상태 가져오기
  const { data: oldSchedule } = await supabase.from('schedules').select('*').eq('id', id).single()
  if (!oldSchedule) throw new Error('일정을 찾을 수 없습니다.')

  // DB 필드 매핑
  const updateData: any = { updated_by: user.id }
  if (input.title) updateData.title = input.title
  if (input.description !== undefined) updateData.description = input.description
  if (input.startAt) updateData.start_at = input.startAt
  if (input.endAt !== undefined) updateData.end_at = input.endAt
  if (input.category) updateData.category = input.category
  if (input.sourceUrl && input.sourceUrl !== oldSchedule.source_url) {
    updateData.source_url = input.sourceUrl
    updateData.link_check_status = await checkLinkAccessibility(input.sourceUrl)
  }

  // 3. 수정 반영
  const { data: newSchedule, error } = await supabase
    .from('schedules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !newSchedule) throw new Error('일정 수정에 실패했습니다.')

  // 4. 리비전 남기기
  const diff = Object.keys(updateData).reduce((acc: any, key) => {
    if (key !== 'updated_by') {
       acc[key] = { old: oldSchedule[key], new: newSchedule[key] }
    }
    return acc
  }, {})

  await supabase.from('schedule_revisions').insert({
    schedule_id: id,
    diff,
    snapshot: newSchedule,
    edited_by: user.id,
    reason
  })

  return newSchedule
}
