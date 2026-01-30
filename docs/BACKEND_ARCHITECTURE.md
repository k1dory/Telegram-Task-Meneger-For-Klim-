# Backend Architecture - Go

## Project Structure

```
backend/
├── cmd/
│   └── server/
│       └── main.go           # Application entry point
│
├── internal/
│   ├── config/
│   │   └── config.go         # Configuration loading
│   │
│   ├── domain/
│   │   ├── user.go           # User entity
│   │   ├── folder.go         # Folder entity
│   │   ├── board.go          # Board entity
│   │   ├── item.go           # Board item entity
│   │   └── reminder.go       # Reminder entity
│   │
│   ├── repository/
│   │   ├── postgres/
│   │   │   ├── user.go
│   │   │   ├── folder.go
│   │   │   ├── board.go
│   │   │   ├── item.go
│   │   │   └── reminder.go
│   │   └── interfaces.go     # Repository interfaces
│   │
│   ├── service/
│   │   ├── auth.go           # Authentication service
│   │   ├── folder.go         # Folder business logic
│   │   ├── board.go          # Board business logic
│   │   ├── item.go           # Item business logic
│   │   └── notification.go   # Notification service
│   │
│   ├── handler/
│   │   ├── auth.go           # Auth endpoints
│   │   ├── folder.go         # Folder endpoints
│   │   ├── board.go          # Board endpoints
│   │   ├── item.go           # Item endpoints
│   │   └── middleware.go     # HTTP middlewares
│   │
│   └── scheduler/
│       └── reminder.go       # Background job scheduler
│
├── pkg/
│   ├── telegram/
│   │   ├── bot.go            # Telegram Bot API client
│   │   └── validator.go      # initData validation
│   │
│   └── database/
│       └── postgres.go       # Database connection
│
├── migrations/
│   ├── 001_init.up.sql
│   └── 001_init.down.sql
│
├── go.mod
├── go.sum
└── Dockerfile
```

## Database Schema

```sql
-- Users table
CREATE TABLE users (
    id BIGINT PRIMARY KEY,  -- Telegram user ID
    username VARCHAR(255),
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    language_code VARCHAR(10) DEFAULT 'en',
    notification_enabled BOOLEAN DEFAULT true,
    reminder_hours INTEGER[] DEFAULT '{6,8,12}',
    last_active_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Folders table
CREATE TABLE folders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    color VARCHAR(7) DEFAULT '#8b5cf6',
    icon VARCHAR(50),
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_folders_user_id ON folders(user_id);

-- Board types enum
CREATE TYPE board_type AS ENUM (
    'notes', 'time_manager', 'kanban', 
    'checklist', 'calendar', 'habit_tracker'
);

-- Boards table
CREATE TABLE boards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    folder_id UUID REFERENCES folders(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    type board_type NOT NULL,
    settings JSONB DEFAULT '{}',
    position INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_boards_folder_id ON boards(folder_id);

-- Items table (polymorphic for all board types)
CREATE TABLE items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    board_id UUID REFERENCES boards(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES items(id) ON DELETE CASCADE,
    title VARCHAR(500),
    content TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    position INTEGER DEFAULT 0,
    due_date TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_items_board_id ON items(board_id);
CREATE INDEX idx_items_due_date ON items(due_date);

-- Reminders table
CREATE TABLE reminders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    remind_at TIMESTAMP WITH TIME ZONE NOT NULL,
    message TEXT,
    sent BOOLEAN DEFAULT false,
    sent_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_reminders_remind_at ON reminders(remind_at) WHERE sent = false;

-- Activity log for inactivity tracking
CREATE TABLE activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    action VARCHAR(50) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_activity_log_user_created ON activity_log(user_id, created_at DESC);

-- Habit completions
CREATE TABLE habit_completions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_id UUID REFERENCES items(id) ON DELETE CASCADE,
    completed_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(item_id, completed_date)
);
```

## API Endpoints

### Authentication
- POST /api/auth/telegram - Validate Telegram initData, return JWT
- GET  /api/auth/me - Get current user

### Folders
- GET    /api/folders - List user folders
- POST   /api/folders - Create folder
- GET    /api/folders/:id - Get folder with boards
- PUT    /api/folders/:id - Update folder
- DELETE /api/folders/:id - Delete folder

### Boards
- GET    /api/folders/:folderId/boards - List boards
- POST   /api/folders/:folderId/boards - Create board
- GET    /api/boards/:id - Get board with items
- PUT    /api/boards/:id - Update board
- DELETE /api/boards/:id - Delete board

### Items
- GET    /api/boards/:boardId/items - List items
- POST   /api/boards/:boardId/items - Create item
- GET    /api/items/:id - Get item
- PUT    /api/items/:id - Update item
- DELETE /api/items/:id - Delete item
- PUT    /api/items/:id/complete - Mark complete
- POST   /api/items/:id/reminder - Set reminder

### Analytics
- GET /api/analytics/overview - Dashboard stats
- GET /api/analytics/completion - Completion rates

## Notification System

### Scheduler Jobs (run with cron)

1. **CheckReminders** (every 5 min)
   - Get pending reminders where remind_at <= now
   - Send Telegram notification
   - Mark as sent

2. **CheckInactiveUsers** (every hour)
   - Find users not active for N hours
   - Select random interval (6, 8, or 12 hours)
   - Send gentle reminder via Telegram

3. **CheckForgottenTasks** (daily at midnight)
   - Find overdue tasks
   - Notify users about overdue items

## Authentication Flow

1. Frontend loads Telegram Mini App
2. Get initData from Telegram.WebApp
3. POST /api/auth/telegram with initData
4. Backend validates signature using bot token
5. Generate JWT token
6. Return token to frontend
