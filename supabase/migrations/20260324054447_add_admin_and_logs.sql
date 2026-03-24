-- 1. Create user_roles
CREATE TABLE public.user_roles (
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role TEXT NOT NULL CHECK (role IN ('user', 'admin')) DEFAULT 'user',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own role" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Admins can view all roles
CREATE POLICY "Admins can view all roles" ON public.user_roles FOR SELECT USING (public.is_admin());


-- 2. Modify schedules to support soft delete
ALTER TABLE public.schedules ADD COLUMN is_deleted BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.schedules ADD COLUMN deleted_at TIMESTAMPTZ;

-- 3. Create notices
CREATE TABLE public.notices (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    is_published BOOLEAN NOT NULL DEFAULT FALSE,
    is_pinned BOOLEAN NOT NULL DEFAULT FALSE,
    is_important BOOLEAN NOT NULL DEFAULT FALSE,
    author_user_id UUID REFERENCES auth.users(id),
    author_nickname TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_at TIMESTAMPTZ
);

ALTER TABLE public.notices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notices are viewable by everyone if published" ON public.notices FOR SELECT USING (is_published = TRUE);
CREATE POLICY "Admins can view all notices" ON public.notices FOR SELECT USING (public.is_admin());
CREATE POLICY "Admins can insert notices" ON public.notices FOR INSERT WITH CHECK (public.is_admin());
CREATE POLICY "Admins can update notices" ON public.notices FOR UPDATE USING (public.is_admin());
CREATE POLICY "Admins can delete notices" ON public.notices FOR DELETE USING (public.is_admin());


-- 4. Create schedule_update_logs
CREATE TABLE public.schedule_update_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    schedule_id UUID NOT NULL REFERENCES public.schedules(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('create', 'update', 'delete')),
    input_method TEXT NOT NULL CHECK (input_method IN ('manual', 'bulk')),
    logged_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    title_snapshot TEXT NOT NULL,
    streamer_name_snapshot TEXT NOT NULL,
    start_at_snapshot TIMESTAMPTZ NOT NULL,
    actor_user_id UUID REFERENCES auth.users(id),
    actor_nickname TEXT NOT NULL,
    actor_ip_masked TEXT,
    actor_role TEXT NOT NULL CHECK (actor_role IN ('user', 'admin')),
    change_summary TEXT,
    before_data JSONB,
    after_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.schedule_update_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Logs are viewable by everyone" ON public.schedule_update_logs FOR SELECT USING (TRUE);
CREATE POLICY "Authenticated users can insert logs" ON public.schedule_update_logs FOR INSERT WITH CHECK (auth.role() = 'authenticated');


-- 5. Updated At Triggers
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_notices_updated_at
BEFORE UPDATE ON public.notices
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

CREATE TRIGGER set_user_roles_updated_at
BEFORE UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE PROCEDURE public.set_current_timestamp_updated_at();
