# UX/UI Design - Telegram Task Manager Mini App

## Color Palette

### Primary (Purple-Dark)
```css
--primary-50: #f3e8ff;
--primary-100: #e9d5ff;
--primary-200: #d8b4fe;
--primary-300: #c084fc;
--primary-400: #a855f7;
--primary-500: #8b5cf6;  /* Main accent */
--primary-600: #7c3aed;
--primary-700: #6d28d9;
--primary-800: #5b21b6;
--primary-900: #4c1d95;
```

### Background (Gray-Blue Dark)
```css
--bg-primary: #0f172a;    /* Main background */
--bg-secondary: #1e293b;  /* Cards, panels */
--bg-tertiary: #334155;   /* Elevated elements */
--bg-hover: #475569;      /* Hover states */
```

### Text
```css
--text-primary: #f8fafc;
--text-secondary: #94a3b8;
--text-muted: #64748b;
```

### Status Colors
```css
--success: #22c55e;
--warning: #f59e0b;
--error: #ef4444;
--info: #3b82f6;
```

---

## Information Architecture

### Screen Hierarchy

```
App Root
├── Home (Dashboard)
│   ├── Recent Activity
│   ├── Today's Tasks
│   └── Quick Actions
│
├── Folders List
│   ├── Folder Item → Boards List
│   │   ├── Notes Board
│   │   ├── Time Manager Board
│   │   ├── Kanban Board
│   │   ├── Checklist Board
│   │   ├── Calendar Board
│   │   └── Habit Tracker Board
│   └── Create Folder
│
├── Analytics
│   ├── Task Completion Chart
│   ├── Time Spent Diagram
│   └── Habit Streaks
│
├── Notifications
│   └── Notification Settings
│
└── Settings
    ├── Profile
    ├── Reminder Preferences
    ├── Theme
    └── Data Export
```

---

## Board Types

### 1. Notes Board
- Simple text notes with rich formatting
- Attachment support (images)
- "Remind me" button per note
- Search within notes

### 2. Time Manager Board
- 24-hour grid view
- Time blocks (drag to resize)
- Color-coded categories
- Daily/Weekly view toggle

### 3. Kanban Board
- Default columns: To Do, In Progress, Done
- Custom columns support
- Drag-and-drop cards
- Card labels and due dates

### 4. Checklist Board
- Nested lists support
- Progress indicator per list
- Bulk actions (check all, delete completed)
- Sorting options

### 5. Calendar Board
- Month/Week/Day views
- Event creation with reminders
- Integration with other boards' due dates
- Color-coded events

### 6. Habit Tracker Board
- Daily habit grid (GitHub-style)
- Streak counter
- Weekly/Monthly goals
- Habit statistics

---

## Component System

### Core Components

```
Components/
├── Layout/
│   ├── AppShell
│   ├── Sidebar
│   ├── Header
│   └── BottomNav (mobile)
│
├── Navigation/
│   ├── FolderList
│   ├── BoardTabs
│   └── Breadcrumbs
│
├── Cards/
│   ├── NoteCard
│   ├── TaskCard
│   ├── HabitCard
│   └── EventCard
│
├── Forms/
│   ├── TextInput
│   ├── DateTimePicker
│   ├── ColorPicker
│   └── ReminderSelector
│
├── Feedback/
│   ├── Toast
│   ├── Modal
│   ├── ConfirmDialog
│   └── LoadingSpinner
│
└── Charts/
    ├── PieChart
    ├── BarChart
    └── HeatmapGrid
```

---

## User Flows

### Flow 1: Create New Folder with Board

```
1. Home → Tap "+" FAB
2. Select "New Folder"
3. Enter folder name → Confirm
4. Folder created → Auto-open
5. Tap "Add Board"
6. Select board type
7. Configure board (name, color)
8. Board ready to use
```

### Flow 2: Add Task with Reminder

```
1. Open folder → Select board
2. Tap "+" to add item
3. Enter task details
4. Toggle "Set reminder"
5. Select date/time
6. Save task
7. System schedules notification
```

### Flow 3: Receive & Handle Notification

```
1. User receives Telegram notification
2. Tap notification → Opens Mini App
3. Navigates to specific item
4. User can: Complete / Snooze / Edit
5. Update synced across devices
```

---

## Telegram Mini App Adaptations

### Main Button
- Used for primary actions (Save, Create, Confirm)
- Dynamic text based on context

### Back Button
- Always enabled when not on home
- Handles navigation stack

### Haptic Feedback
- Light: Selection changes
- Medium: Task completion
- Heavy: Delete actions

### Theme Adaptation
```typescript
// Use Telegram theme colors as fallback
const colors = {
  bg: window.Telegram?.WebApp?.backgroundColor || '#0f172a',
  text: window.Telegram?.WebApp?.textColor || '#f8fafc',
};
```

### Safe Areas
- Respect `safeAreaInset` for notched devices
- Bottom padding for Mini App controls

---

## Responsive Layout

### Mobile (< 480px)
- Single column layout
- Bottom navigation
- Full-screen modals
- Swipe gestures for actions

### Tablet (480px - 768px)
- Two-column layout option
- Side panel for details
- Split view for Kanban

### Desktop (> 768px)
- Full sidebar visible
- Multi-column boards
- Keyboard shortcuts

---

## Micro-interactions

1. **Task Completion**: Checkbox → Confetti animation → Strike-through
2. **Drag & Drop**: Card lifts with shadow → Drop zone highlights
3. **Pull to Refresh**: Custom loading animation
4. **Swipe Actions**: Reveal delete/edit buttons
5. **Habit Check**: Ripple effect → Cell fills with color
