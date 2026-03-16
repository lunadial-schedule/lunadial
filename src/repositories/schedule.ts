/**
 * 일정(Schedule) 리포지토리
 *
 * Supabase의 schedules / schedule_revisions 테이블에 대한 CRUD를 캡슐화한다.
 * 인증 확인, 레이트리밋, 링크 검증, 리비전(변경 이력) 저장을 포함한다.
 */
import { createClient } from '@/lib/supabase/server'
import { ensureStreamerExists } from './streamer'
import { checkLinkAccessibility } from '@/lib/link-validator'
import { RATE_LIMIT } from '@/config/env'

/** 일정 카테고리 타입 */
export type ScheduleCategory = '컨텐츠' | '합방' | '대회' | '기타'
/** 일정 상태 (확정 / 변경됨 / 취소됨) */
export type ScheduleStatus = 'confirmed' | 'changed' | 'canceled'
/** 링크 검증 결과 타입 */
export type LinkCheckStatus = 'ok' | 'failed' | 'unknown'

/** 일정 생성 입력 데이터 */
export interface CreateScheduleInput {
  streamerId: string
  title: string
  description?: string
  startAt: string  // ISO 8601
  endAt?: string   // ISO 8601
  category: ScheduleCategory
  sourceUrl: string
}

/**
 * 새 일정을 생성한다.
 *
 * 처리 흐름:
 * 1. 사용자 인증 확인
 * 2. 일일 생성 레이트리밋 검증 (30회/일)
 * 3. 스트리머 존재 보장 (없으면 치지직 API로 자동 등록)
 * 4. 소스 URL 접근성 검증
 * 5. DB 삽입
 * 6. 초기 리비전(변경 이력) 저장
 */
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

  // 5. DB 삽입
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
    console.error('일정 생성 에러:', error)
    throw new Error('일정 생성에 실패했습니다.')
  }

  // 6. 리비전(변경 이력) 초기 스냅샷 저장
  await supabase.from('schedule_revisions').insert({
    schedule_id: newSchedule.id,
    diff: { action: 'created', initial_state: newSchedule },
    snapshot: newSchedule,
    edited_by: user.id,
    reason: 'Initial creation'
  })

  return newSchedule
}

/**
 * 기간 내 일정 목록을 조회한다.
 * @param startDate - 조회 시작일 (ISO 8601)
 * @param endDate - 조회 종료일 (ISO 8601)
 * @param streamerId - (선택) 특정 스트리머로 필터링
 */
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

/**
 * 중복 일정을 검사한다.
 * 동일 스트리머의 ±2시간 이내 일정 중 제목이 부분 일치하는 건을 반환한다.
 * @param streamerId - 스트리머 ID
 * @param startAt - 일정 시작 시각 (ISO 8601)
 * @param titleToken - 제목 부분 검색어
 */
export async function checkDuplicate(streamerId: string, startAt: string, titleToken: string) {
  const supabase = await createClient()
  const start = new Date(startAt)
  // ±2시간 범위 내에서 중복 검사
  const fromObj = new Date(start.getTime() - 2 * 60 * 60 * 1000)
  const toObj = new Date(start.getTime() + 2 * 60 * 60 * 1000)

  const { data, error } = await supabase
    .from('schedules')
    .select('*')
    .eq('streamer_id', streamerId)
    .gte('start_at', fromObj.toISOString())
    .lte('start_at', toObj.toISOString())

  if (error || !data) return []

  // 제목 부분 일치 필터링
  return data.filter(s => s.title.includes(titleToken) || titleToken.includes(s.title))
}

/**
 * 기존 일정을 수정한다.
 *
 * 처리 흐름:
 * 1. 일일 수정 레이트리밋 검증 (30회/일)
 * 2. 현재 상태 조회
 * 3. 변경된 필드만 DB 업데이트 (소스 URL 변경 시 재검증)
 * 4. 리비전(변경 이력) 저장 (old → new diff)
 *
 * @param id - 일정 ID
 * @param input - 수정할 필드들
 * @param reason - 수정 사유
 */
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

  // 3. 변경 필드 매핑
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

  // 4. DB 업데이트
  const { data: newSchedule, error } = await supabase
    .from('schedules')
    .update(updateData)
    .eq('id', id)
    .select()
    .single()

  if (error || !newSchedule) throw new Error('일정 수정에 실패했습니다.')

  // 5. 리비전 저장 (변경 전후 diff)
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
