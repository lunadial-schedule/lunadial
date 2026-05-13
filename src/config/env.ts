/**
 * 환경변수 설정
 *
 * 서버/클라이언트에서 사용하는 모든 환경변수를 중앙 관리한다.
 * - NEXT_PUBLIC_ 접두사: 브라우저에 노출되는 공개 키
 * - 접두사 없음: 서버 전용 시크릿 (브라우저 번들에 포함 불가)
 */

/** Supabase 프로젝트 URL (공개) */
export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || ''
/** Supabase 익명 키 (공개) */
export const SUPABASE_PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** 치지직 Open API 클라이언트 ID (서버 전용) */
export const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID || ''
/** 치지직 Open API 클라이언트 시크릿 (서버 전용 — 절대 브라우저에 노출 금지) */
export const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET || ''
/** 치지직 Open API 베이스 URL (기본값: https://openapi.chzzk.naver.com) */
export const CHZZK_OPENAPI_BASE_URL = process.env.CHZZK_OPENAPI_BASE_URL || 'https://openapi.chzzk.naver.com'
/** 치지직 계정 연동 기능 활성화 여부 (공개) */
export const ENABLE_CHZZK_CONNECT = process.env.NEXT_PUBLIC_ENABLE_CHZZK_CONNECT === 'true'

/** Gemini AI API 키 (서버 전용) */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''


/**
 * 앱 정책 상수
 * - SCHEDULE_CREATE: 일정 생성 레이트리밋 (초)
 * - SCHEDULE_UPDATE: 일정 수정 레이트리밋 (초)
 */
export const RATE_LIMIT = {
  SCHEDULE_CREATE: 30,
  SCHEDULE_UPDATE: 30
}
