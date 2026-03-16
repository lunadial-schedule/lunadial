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
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || ''

/** 치지직 Open API 클라이언트 ID (서버 전용) */
export const CHZZK_CLIENT_ID = process.env.CHZZK_CLIENT_ID || ''
/** 치지직 Open API 클라이언트 시크릿 (서버 전용 — 절대 브라우저에 노출 금지) */
export const CHZZK_CLIENT_SECRET = process.env.CHZZK_CLIENT_SECRET || ''
/** 치지직 Open API 베이스 URL (기본값: https://openapi.chzzk.naver.com) */
export const CHZZK_OPENAPI_BASE_URL = process.env.CHZZK_OPENAPI_BASE_URL || 'https://openapi.chzzk.naver.com'

/** 포트원 결제 API 시크릿 (서버 전용) */
export const PORTONE_API_SECRET = process.env.PORTONE_API_SECRET || ''
/** 포트원 스토어 ID (공개) */
export const PORTONE_STORE_ID = process.env.NEXT_PUBLIC_PORTONE_STORE_ID || ''
/** 포트원 채널 키 (공개) */
export const PORTONE_CHANNEL_KEY = process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY || ''

/** Gemini AI API 키 (서버 전용) */
export const GEMINI_API_KEY = process.env.GEMINI_API_KEY || ''

/** 웹 푸시 VAPID 공개 키 (공개) */
export const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
/** 웹 푸시 VAPID 비공개 키 (서버 전용) */
export const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''
/** 웹 푸시 VAPID 연락처 (서버 전용, 예: mailto:admin@example.com) */
export const VAPID_SUBJECT = process.env.VAPID_SUBJECT || ''

/**
 * 앱 정책 상수
 * - SCHEDULE_CREATE: 일정 생성 레이트리밋 (초)
 * - SCHEDULE_UPDATE: 일정 수정 레이트리밋 (초)
 */
export const RATE_LIMIT = {
  SCHEDULE_CREATE: 30,
  SCHEDULE_UPDATE: 30
}
