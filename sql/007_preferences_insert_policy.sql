-- Users must be able to INSERT their own preferences row (upsert / first save).
-- Without this policy, PUT /api/settings/preferences returns 400 on upsert.

DROP POLICY IF EXISTS "preferences insert own" ON user_digest_preferences;

CREATE POLICY "preferences insert own" ON user_digest_preferences
    FOR INSERT TO authenticated
    WITH CHECK (auth.uid() = user_id);
