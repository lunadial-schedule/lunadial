-- =============================================================================
-- 메인페이지 초기 로딩 성능 최적화를 위한 인덱스 추가
-- 
-- 배경: schedules 테이블의 메인 쿼리 (홈, 캘린더)에서
--       is_deleted = false + start_time 범위 + ORDER BY start_time 조건을
--       Full Table Scan으로 처리 중. 데이터 증가에 따라 성능 저하 발생.
-- =============================================================================

-- 1. schedules: 홈/캘린더 메인 쿼리 최적화
-- 쿼리 패턴: WHERE is_deleted = false AND start_time >= ? AND start_time <= ? ORDER BY start_time ASC
-- Partial Index로 삭제되지 않은 행만 인덱싱하여 인덱스 크기를 최소화한다.
CREATE INDEX IF NOT EXISTS idx_schedules_active_start_time
  ON public.schedules (start_time ASC)
  WHERE is_deleted = false;

-- 2. favorites: user_id 단독 인덱스
-- 쿼리 패턴: WHERE user_id = ? (RLS 정책 + getMyFavoriteStreamerNames 등)
-- 기존 UNIQUE(user_id, streamer_id)는 user_id 단독 조회에 최적이 아닐 수 있음.
CREATE INDEX IF NOT EXISTS idx_favorites_user_id
  ON public.favorites (user_id);

-- 3. schedules: 스트리머별 일정 조회 최적화
-- 쿼리 패턴: WHERE streamer_id = ? AND is_deleted = false ORDER BY start_time ASC
-- 즐겨찾기 스트리머 기반 필터, 캘린더 스트리머 필터에서 사용.
CREATE INDEX IF NOT EXISTS idx_schedules_streamer_start
  ON public.schedules (streamer_id, start_time ASC)
  WHERE is_deleted = false;
