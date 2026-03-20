-- 0. Ensure updated_at update function exists
create or replace function public.update_updated_at_column()
returns trigger language plpgsql as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

-- 1. push_subscriptions table
create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  is_active boolean default true,
  last_seen_at timestamptz default now(),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for performance
create index if not exists idx_push_subs_user_id on public.push_subscriptions(user_id);
create index if not exists idx_push_subs_is_active on public.push_subscriptions(is_active);

-- 2. notification_preferences table
create table if not exists public.notification_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  notify_live_start boolean default true,
  notify_schedule_change boolean default true,
  notify_notice boolean default true,
  quiet_hours_enabled boolean default false,
  quiet_hours_start time null,
  quiet_hours_end time null,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 3. notification_deliveries table
create table if not exists public.notification_deliveries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  subscription_id uuid references public.push_subscriptions(id) on delete set null,
  type text check (type in ('live_start', 'schedule_changed', 'notice', 'test')),
  entity_type text,
  entity_id text,
  title text not null,
  body text,
  status text check (status in ('sent', 'failed', 'skipped')),
  error_message text,
  sent_at timestamptz default now()
);

-- Index for performance
create index if not exists idx_notification_deliveries_user_id on public.notification_deliveries(user_id);

-- RLS Policies Enabling
alter table public.push_subscriptions enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notification_deliveries enable row level security;

-- Idempotent RLS Policies creation using DO blocks
do $$
begin
    -- push_subscriptions policies
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own push subscriptions') then
        create policy "Users can view their own push subscriptions" on public.push_subscriptions for select using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can insert their own push subscriptions') then
        create policy "Users can insert their own push subscriptions" on public.push_subscriptions for insert with check (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can update their own push subscriptions') then
        create policy "Users can update their own push subscriptions" on public.push_subscriptions for update using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can delete their own push subscriptions') then
        create policy "Users can delete their own push subscriptions" on public.push_subscriptions for delete using (auth.uid() = user_id);
    end if;

    -- notification_preferences policies
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own notification preferences') then
        create policy "Users can view their own notification preferences" on public.notification_preferences for select using (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can insert their own notification preferences') then
        create policy "Users can insert their own notification preferences" on public.notification_preferences for insert with check (auth.uid() = user_id);
    end if;
    if not exists (select 1 from pg_policies where policyname = 'Users can update their own notification preferences') then
        create policy "Users can update their own notification preferences" on public.notification_preferences for update using (auth.uid() = user_id);
    end if;

    -- notification_deliveries policies
    if not exists (select 1 from pg_policies where policyname = 'Users can view their own notification deliveries') then
        create policy "Users can view their own notification deliveries" on public.notification_deliveries for select using (auth.uid() = user_id);
    end if;
end
$$;

-- Triggers (Idempotent check and creation)
do $$
begin
    if not exists (select 1 from pg_trigger where tgname = 'update_push_subscriptions_updated_at') then
        create trigger update_push_subscriptions_updated_at
            before update on public.push_subscriptions
            for each row execute procedure public.update_updated_at_column();
    end if;

    if not exists (select 1 from pg_trigger where tgname = 'update_notification_preferences_updated_at') then
        create trigger update_notification_preferences_updated_at
            before update on public.notification_preferences
            for each row execute procedure public.update_updated_at_column();
    end if;
end
$$;
