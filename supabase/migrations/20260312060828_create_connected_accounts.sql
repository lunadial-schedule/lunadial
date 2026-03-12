CREATE TABLE IF NOT EXISTS public.connected_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  provider_user_id text not null,
  provider_username text,
  access_token_encrypted text,
  refresh_token_encrypted text,
  token_expires_at timestamptz,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  UNIQUE(provider, provider_user_id),
  UNIQUE(user_id, provider)
);

ALTER TABLE public.connected_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own connected accounts" 
ON public.connected_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connected accounts" 
ON public.connected_accounts 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connected accounts"
ON public.connected_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own connected accounts"
ON public.connected_accounts
FOR DELETE
USING (auth.uid() = user_id);
