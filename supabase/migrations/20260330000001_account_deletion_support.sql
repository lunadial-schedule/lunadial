-- ===========================================================
-- 계정 삭제(회원 탈퇴) 지원을 위한 마이그레이션
--
-- 목적:
--   1. 사용자 삭제 시 공용 데이터(일정, 로그)가 FK 제약으로 삭제되지 않도록
--      관련 FK를 ON DELETE SET NULL로 변경
--   2. profiles 테이블 FK를 ON DELETE CASCADE로 정리
--   3. 운영 로그용 account_deletion_logs 테이블 생성
-- ===========================================================

-- 1. schedules.user_id FK → ON DELETE SET NULL
--    일정은 공용 데이터이므로 사용자 삭제 시에도 보존하되 작성자만 익명화
ALTER TABLE public.schedules
  DROP CONSTRAINT IF EXISTS schedules_user_id_fkey;
ALTER TABLE public.schedules
  ADD CONSTRAINT schedules_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2. schedule_update_logs.actor_user_id FK → ON DELETE SET NULL
ALTER TABLE public.schedule_update_logs
  DROP CONSTRAINT IF EXISTS schedule_update_logs_actor_user_id_fkey;
ALTER TABLE public.schedule_update_logs
  ADD CONSTRAINT schedule_update_logs_actor_user_id_fkey
  FOREIGN KEY (actor_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 4. notices.author_user_id FK → ON DELETE SET NULL
ALTER TABLE public.notices
  DROP CONSTRAINT IF EXISTS notices_author_user_id_fkey;
ALTER TABLE public.notices
  ADD CONSTRAINT notices_author_user_id_fkey
  FOREIGN KEY (author_user_id) REFERENCES auth.users(id) ON DELETE SET NULL;

-- 5. profiles.id FK → ON DELETE CASCADE (스키마 정리)
--    profiles 테이블이 이미 존재하는 경우에만 적용
DO $$
DECLARE
  _constraint_name TEXT;
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'profiles'
  ) THEN
    -- 기존 FK 제거 시도 (이름을 모르므로 동적 처리)
    SELECT tc.constraint_name INTO _constraint_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    WHERE tc.table_schema = 'public'
      AND tc.table_name = 'profiles'
      AND tc.constraint_type = 'FOREIGN KEY'
      AND kcu.column_name = 'id'
    LIMIT 1;

    IF _constraint_name IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.profiles DROP CONSTRAINT %I', _constraint_name);
    END IF;

    -- CASCADE FK 재생성
    ALTER TABLE public.profiles
      ADD CONSTRAINT profiles_id_fkey
      FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- 6. 계정 삭제 운영 로그 테이블
CREATE TABLE IF NOT EXISTS public.account_deletion_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  user_email TEXT,
  user_nickname TEXT,
  subscription_status TEXT NOT NULL,
  deleted_tables JSONB,
  anonymized_tables JSONB,
  storage_deleted BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL CHECK (status IN ('success', 'partial_failure', 'failure')),
  error_details TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.account_deletion_logs ENABLE ROW LEVEL SECURITY;

-- 일반 사용자는 조회 불가 (Service Role은 RLS 우회하므로 대시보드에서 조회 가능)
CREATE POLICY "Deny all access to deletion logs"
  ON public.account_deletion_logs
  FOR ALL
  USING (false);
