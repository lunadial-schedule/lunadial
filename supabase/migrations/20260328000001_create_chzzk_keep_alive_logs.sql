CREATE TABLE IF NOT EXISTS public.chzzk_keep_alive_logs (
  id uuid primary key default gen_random_uuid(),
  status text not null, -- 'success', 'failure'
  token_refreshed boolean default false,
  profile_fetched boolean default false,
  target_user_id uuid,
  target_channel_id text,
  target_channel_name text,
  error_message text,
  executed_by uuid references auth.users(id),
  executed_at timestamptz default now()
);

-- RLS 설정
ALTER TABLE public.chzzk_keep_alive_logs ENABLE ROW LEVEL SECURITY;

-- 관리자만 로그를 볼 수 있도록 설정 (기존 user_roles 테이블 활용)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'chzzk_keep_alive_logs' AND policyname = 'Admins can view keep-alive logs'
  ) THEN
    CREATE POLICY "Admins can view keep-alive logs" 
    ON public.chzzk_keep_alive_logs 
    FOR SELECT 
    USING (
      EXISTS (
        SELECT 1 FROM public.user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
      )
    );
  END IF;
END
$$;
