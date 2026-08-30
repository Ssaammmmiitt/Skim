-- Fix infinite RLS recursion on profiles admin policies.
-- Run once in Supabase SQL Editor if you already applied 002_users_auth_preferences.sql.

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

DROP POLICY IF EXISTS "profiles read admin" ON profiles;
CREATE POLICY "profiles read admin" ON profiles
    FOR SELECT TO authenticated
    USING (public.is_active_admin());

DROP POLICY IF EXISTS "profiles admin update" ON profiles;
CREATE POLICY "profiles admin update" ON profiles
    FOR UPDATE TO authenticated
    USING (public.is_active_admin());
