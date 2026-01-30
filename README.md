# Telegram Task Manager Mini App

Task manager, notes, and productivity app as a Telegram Mini App with automatic reminders.

## Features

- **Folders** - Organize boards into folders (e.g., "Cooking Ideas")
- **Boards**:
  - Notes - Simple notes with reminders
  - Time Manager - Hourly grid scheduler
  - Kanban - Drag-and-drop task boards
  - Checklists/Todo - Lists with checkboxes
  - Calendar - Date-based task view
  - Habit Tracker - Track daily habits
- **Smart Notifications** - Automatic reminders every 6-8-12 hours
- **Analytics** - Charts and progress visualization

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React + Vite + TypeScript |
| Backend | Go |
| Database | PostgreSQL |
| Infrastructure | Docker, Docker Compose |
| CI/CD | GitHub Actions |

## Project Structure

```
telegram-task-manager/
├── frontend/          # React Mini App
├── backend/           # Go API server
├── docs/              # Documentation
├── scripts/           # Utility scripts
├── .github/workflows/ # CI/CD pipelines
├── docker-compose.yml
└── README.md
```

## Quick Start

### Prerequisites
- Docker & Docker Compose
- Node.js 20+ (for local frontend dev)
- Go 1.22+ (for local backend dev)
- Telegram Bot Token

### Development

```bash
# Clone repository
git clone <repo-url>
cd telegram-task-manager

# Start all services
docker-compose up -d

# Frontend: http://localhost:5173
# Backend API: http://localhost:8080
# PostgreSQL: localhost:5432
```

### Environment Variables

Create `.env` file:

```env
# Telegram
TELEGRAM_BOT_TOKEN=your_bot_token
TELEGRAM_MINI_APP_URL=https://your-domain.com

# Database
POSTGRES_USER=taskmanager
POSTGRES_PASSWORD=your_password
POSTGRES_DB=taskmanager

# Backend
JWT_SECRET=your_jwt_secret
API_PORT=8080
```

## Design

Color scheme: Purple-dark / Gray-blue

## License

MIT
