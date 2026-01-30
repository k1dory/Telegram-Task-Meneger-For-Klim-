-- Migration: 002_add_timezone (rollback)
-- Description: Remove timezone support for users

DROP INDEX IF EXISTS idx_users_timezone;
ALTER TABLE users DROP COLUMN IF EXISTS timezone;
