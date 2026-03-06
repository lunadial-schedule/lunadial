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
  channel_id text primary key, -- Chzzk Channel ID
  name text not null,
  image_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table public.streamers enable row level security;
create policy "Streamers are viewable by everyone" on public.streamers for select using (true);
create policy "Anyone can insert a streamer (if valid)" on public.streamers for insert with check (true);


-- 3. Schedules table
create table public.schedules (
  id uuid default uuid_generate_v4() primary key,
  streamer_id text references public.streamers(channel_id) on delete cascade not null,
  title text not null,
  description text,
  start_at timestamp with time zone not null,
  end_at timestamp with time zone,
  category text check (category in ('컨텐츠', '합방', '대회', '기타')),
  source_url text not null,
  status text default 'confirmed' check (status in ('confirmed', 'changed', 'canceled')),
  link_check_status text default 'unknown' check (link_check_status in ('ok', 'failed', 'unknown')),
  created_by uuid references public.users(id),
  updated_by uuid references public.users(id),
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
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
  user_id uuid references public.users(id) on delete cascade not null,
  streamer_id text references public.streamers(channel_id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  primary key (user_id, streamer_id)
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
