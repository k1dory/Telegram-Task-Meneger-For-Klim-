-- Telegram Task Manager Database Schema
-- Migration: 001_init (DOWN)
-- Description: Rollback initial database schema

-- Drop triggers first
DROP TRIGGER IF EXISTS update_items_updated_at ON items;
DROP TRIGGER IF EXISTS update_boards_updated_at ON boards;
DROP TRIGGER IF EXISTS update_folders_updated_at ON folders;
DROP TRIGGER IF EXISTS update_users_updated_at ON users;

-- Drop function
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Drop tables in reverse order of dependencies
DROP TABLE IF EXISTS habit_completions;
DROP TABLE IF EXISTS activity_log;
DROP TABLE IF EXISTS reminders;
DROP TABLE IF EXISTS items;
DROP TABLE IF EXISTS boards;
DROP TABLE IF EXISTS folders;
DROP TABLE IF EXISTS users;

-- Drop enum type
DROP TYPE IF EXISTS board_type;

-- Note: We don't drop the pgcrypto extension as it might be used by other schemas
