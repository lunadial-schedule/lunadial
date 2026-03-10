-- Enable UUID generation
create extension if not exists "uuid-ossp";

-- 1. Users table (Extends Supabase Auth Auth.users)
create table public.users (
  id uuid references auth.users on delete cascade not null primary key,
  role text default 'user' check (role in ('user', 'admin')),
  tier text default 'free' check (tier in ('free', 'pro')),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- RLS
alter table public.users enable row level security;
create policy "Users can view their own profile" on public.users for select using (auth.uid() = id);
create policy "Users can update their own profile" on public.users for update using (auth.uid() = id);

-- Function to handle new user registration
create function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.users (id, role, tier)
  values (new.id, 'user', 'free');
  return new;
end;
$$;

-- Trigger for new user
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();


-- 2. Streamers table
create table public.streamers (
  id uuid default uuid_generate_v4() primary key,
  channel_id text unique, -- Chzzk Channel ID (nullable for MVP manual additions)
  name text not null,
  normalized_name text not null,
  channel_url text,
  image_url text,
  follower_count integer,
  verified_mark boolean default false,
  source_type text default 'manual',
  is_active boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.streamers enable row level security;
create policy "Streamers are viewable by everyone" on public.streamers for select using (true);
create policy "Authenticated users can insert streamers" on public.streamers for insert with check (auth.role() = 'authenticated');


-- 3. Schedules table
create table public.schedules (
  id uuid default uuid_generate_v4() primary key,
  title text not null,
  streamer text not null,
  categories text[],
  start_time timestamp with time zone not null,
  end_time timestamp with time zone,
  status text default 'confirmed' check (status in ('confirmed', 'changed', 'canceled')),
  link text not null,
  memo text,
  user_id uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  is_all_day boolean default false
);

alter table public.schedules enable row level security;
create policy "Schedules are viewable by everyone" on public.schedules for select using (true);
create policy "Authenticated users can insert schedules" on public.schedules for insert with check (auth.role() = 'authenticated');
create policy "Authenticated users can update schedules" on public.schedules for update using (auth.role() = 'authenticated');


-- 4. Schedule Revisions table (for rollback support)
create table public.schedule_revisions (
  id uuid default uuid_generate_v4() primary key,
  schedule_id uuid references public.schedules(id) on delete cascade not null,
  diff jsonb not null,
  snapshot jsonb not null,
  edited_by uuid references public.users(id),
  reason text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.schedule_revisions enable row level security;
create policy "Revisions are viewable by everyone" on public.schedule_revisions for select using (true);
create policy "Authenticated users can insert revisions" on public.schedule_revisions for insert with check (auth.role() = 'authenticated');


-- 5. Favorites table
create table public.favorites (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  streamer_id uuid references public.streamers(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique (user_id, streamer_id)
);

alter table public.favorites enable row level security;
create policy "Users can view their own favorites" on public.favorites for select using (auth.uid() = user_id);
create policy "Users can insert their own favorites" on public.favorites for insert with check (auth.uid() = user_id);
create policy "Users can delete their own favorites" on public.favorites for delete using (auth.uid() = user_id);

-- Update timestamp function
create function update_updated_at_column()
returns trigger language plpgsql as $$
begin
    new.updated_at = timezone('utc'::text, now());
    return new;
end;
$$;

create trigger update_schedules_updated_at
    before update on public.schedules
    for each row execute procedure update_updated_at_column();
