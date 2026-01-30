-- Migration: 002_add_timezone
-- Description: Add timezone support for users

-- Add timezone column to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone VARCHAR(50) DEFAULT 'UTC';

-- Create index for timezone-aware queries
CREATE INDEX IF NOT EXISTS idx_users_timezone ON users(timezone);

-- Add comment for documentation
COMMENT ON COLUMN users.timezone IS 'IANA timezone identifier (e.g., Europe/Moscow, America/New_York)';
