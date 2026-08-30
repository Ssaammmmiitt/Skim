-- Skim Phase 6: Auth, admin approval, per-user digest preferences
-- Run in Supabase SQL Editor after schema.sql
-- Set your superuser email before running the seed block at the bottom.

-- Profiles extend auth.users with approval workflow
CREATE TABLE IF NOT EXISTS profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    display_name TEXT,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'member'
        CHECK (role IN ('superuser', 'admin', 'member')),
    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'active', 'rejected', 'suspended')),
    auth_provider TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES auth.users(id),
    rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS profiles_status_idx ON profiles(status);
CREATE INDEX IF NOT EXISTS profiles_role_idx ON profiles(role);

-- Per-user digest customization (dashboard Settings page)
CREATE TABLE IF NOT EXISTS user_digest_preferences (
    user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    theme TEXT NOT NULL DEFAULT 'cyan'
        CHECK (theme IN ('cyan', 'classic', 'minimal')),
    format TEXT NOT NULL DEFAULT 'full'
        CHECK (format IN ('full', 'brief', 'headlines')),
    max_stories INT NOT NULL DEFAULT 8
        CHECK (max_stories BETWEEN 3 AND 12),
    topic_filters TEXT[],
    email_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Pipeline reads active subscribers + preferences (synced from profiles)
CREATE TABLE IF NOT EXISTS digest_subscribers (
    id SERIAL PRIMARY KEY,
    user_id UUID UNIQUE REFERENCES profiles(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Chat quota guardrail
CREATE TABLE IF NOT EXISTS chat_usage (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    usage_date DATE NOT NULL DEFAULT CURRENT_DATE,
    query_count INT NOT NULL DEFAULT 0,
    UNIQUE (user_id, usage_date)
);

-- Auto-create profile on signup; superuser email env is set in app layer on first login
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.profiles (id, email, display_name, avatar_url, auth_provider, status, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
        NEW.raw_user_meta_data->>'avatar_url',
        NEW.raw_app_meta_data->>'provider',
        'pending',
        'member'
    )
    ON CONFLICT (id) DO NOTHING;

    INSERT INTO public.user_digest_preferences (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_digest_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE digest_subscribers ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE digests ENABLE ROW LEVEL SECURITY;
ALTER TABLE pipeline_runs ENABLE ROW LEVEL SECURITY;

-- Profiles: users read/update self; superuser/admin read all + approve
CREATE OR REPLACE FUNCTION public.is_active_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role IN ('superuser', 'admin')
      AND status = 'active'
  );
$$;

CREATE POLICY "profiles read own" ON profiles
    FOR SELECT TO authenticated
    USING (auth.uid() = id);

CREATE POLICY "profiles read admin" ON profiles
    FOR SELECT TO authenticated
    USING (public.is_active_admin());

CREATE POLICY "profiles update own" ON profiles
    FOR UPDATE TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles insert own" ON profiles
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles admin update" ON profiles
    FOR UPDATE TO authenticated
    USING (public.is_active_admin());

-- Preferences: own row only
CREATE POLICY "preferences read own" ON user_digest_preferences
    FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "preferences update own" ON user_digest_preferences
    FOR UPDATE TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Digest data: active users only
CREATE POLICY "articles read active users" ON articles
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.status = 'active'
        )
    );

CREATE POLICY "digests read active users" ON digests
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.status = 'active'
        )
    );

CREATE POLICY "pipeline_runs read active users" ON pipeline_runs
    FOR SELECT TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles p
            WHERE p.id = auth.uid() AND p.status = 'active'
        )
    );

-- Seed superuser (replace email before running)
-- After signup via Google/OTP, this row links your auth.users id on first login callback.
INSERT INTO profiles (id, email, role, status, approved_at)
SELECT
    id,
    email,
    'superuser',
    'active',
    NOW()
FROM auth.users
WHERE email = 'poudyal.sammit@gmail.com'
ON CONFLICT (email) DO UPDATE
SET role = 'superuser', status = 'active', approved_at = COALESCE(profiles.approved_at, NOW());

-- Sync superuser into digest subscribers when profile exists
INSERT INTO digest_subscribers (user_id, email, active)
SELECT p.id, p.email, TRUE
FROM profiles p
WHERE p.email = 'poudyal.sammit@gmail.com' AND p.status = 'active'
ON CONFLICT (email) DO UPDATE SET active = TRUE;
