-- chzzk_keep_alive_logs 테이블에 관리자 INSERT 정책 추가
-- WHY: 기존 마이그레이션에서 SELECT 정책만 존재하여 INSERT가 RLS에 의해 차단됨

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chzzk_keep_alive_logs' AND policyname = 'Admins can insert keep-alive logs'
  ) THEN
    CREATE POLICY "Admins can insert keep-alive logs"
    ON public.chzzk_keep_alive_logs
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
  END IF;
END
$$;
