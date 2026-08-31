-- Phase 6C: Dashboard appearance preference (light / dark / system)
-- Run after 002_users_auth_preferences.sql

ALTER TABLE user_digest_preferences
  ADD COLUMN IF NOT EXISTS dashboard_theme TEXT NOT NULL DEFAULT 'dark'
    CHECK (dashboard_theme IN ('light', 'dark', 'system'));

COMMENT ON COLUMN user_digest_preferences.dashboard_theme IS
  'Dashboard UI theme: light, dark, or system (follows OS)';
