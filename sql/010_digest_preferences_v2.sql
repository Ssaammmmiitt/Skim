-- ============================================================
-- Migration 010: Digest Preferences v2 + User Activity Streak
-- ============================================================
-- Run in Supabase SQL Editor after 009_onboarding.sql.
-- Safe to re-run (all statements are idempotent).
-- ============================================================

-- ── 1. Widen the email theme CHECK constraint ──────────────────────────────
-- Remove the old narrow constraint and replace with the full 7-theme list.

ALTER TABLE user_digest_preferences
    DROP CONSTRAINT IF EXISTS user_digest_preferences_theme_check;

ALTER TABLE user_digest_preferences
    ADD CONSTRAINT user_digest_preferences_theme_check
    CHECK (theme IN ('cyan', 'classic', 'minimal', 'rose', 'amber', 'violet', 'slate'));

-- ── 2. Add font_style column ───────────────────────────────────────────────
-- Controls the font stack used in the digest email.
-- sans  → Inter / system-ui (modern, default)
-- serif → Georgia / Times  (editorial, newspaper feel)
-- mono  → Courier / monospace (technical, hacker aesthetic)

ALTER TABLE user_digest_preferences
    ADD COLUMN IF NOT EXISTS font_style TEXT NOT NULL DEFAULT 'sans'
    CHECK (font_style IN ('sans', 'serif', 'mono'));

-- ── 3. Add summary_style column ────────────────────────────────────────────
-- Controls how article content is formatted in the digest email.
-- prose        → flowing paragraph (current behaviour)
-- bullet_points → 3-4 key bullet points extracted by LLM at send time
-- card         → compact info-card layout with icon badges

ALTER TABLE user_digest_preferences
    ADD COLUMN IF NOT EXISTS summary_style TEXT NOT NULL DEFAULT 'prose'
    CHECK (summary_style IN ('prose', 'bullet_points', 'card'));

-- ── 4. Per-user reading streak: activity log ──────────────────────────────
-- Tracks one row per (user, calendar-date) so the dashboard can compute
-- consecutive-days streaks without scanning articles/digests globally.

CREATE TABLE IF NOT EXISTS user_activity_log (
    user_id       UUID  NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    activity_date DATE  NOT NULL DEFAULT CURRENT_DATE,
    PRIMARY KEY (user_id, activity_date)
);

ALTER TABLE user_activity_log ENABLE ROW LEVEL SECURITY;

-- Users can only read/write their own activity rows
CREATE POLICY "activity_log own"
    ON user_activity_log
    FOR ALL
    TO authenticated
    USING  (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Index for fast streak queries (chronological descending per user)
CREATE INDEX IF NOT EXISTS user_activity_log_user_date_idx
    ON user_activity_log (user_id, activity_date DESC);

-- ── 5. Preferences INSERT policy (covers new users) ───────────────────────
-- Ensure users can insert their own preference row if it doesn't exist yet
-- (the trigger already does this on signup, but belt-and-suspenders).
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE tablename = 'user_digest_preferences'
          AND policyname = 'preferences insert own'
    ) THEN
        EXECUTE '
            CREATE POLICY "preferences insert own"
                ON user_digest_preferences
                FOR INSERT
                TO authenticated
                WITH CHECK (auth.uid() = user_id)
        ';
    END IF;
END
$$;
