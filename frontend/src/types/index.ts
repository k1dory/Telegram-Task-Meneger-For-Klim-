// User types (from backend)
export interface User {
  id: number;
  telegram_id: number;
  username?: string;
  first_name: string;
  last_name?: string;
  photo_url?: string;
  is_premium: boolean;
  language_code: string;
  notification_enabled: boolean;
  reminder_hours: number[];
  settings?: UserSettings;
  last_active_at?: string;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  notification_enabled: boolean;
  reminder_hours: number[];
  language_code: string;
  timezone?: string;
}

// Folder types (matches backend domain.Folder)
export interface Folder {
  id: string;
  user_id: number;
  name: string;
  color: string;
  icon?: string;
  position: number;
  created_at: string;
  updated_at: string;
  boards?: Board[];
}

// Board types (matches backend domain.Board)
export interface Board {
  id: string;
  folder_id: string;
  name: string;
  type: BoardType;
  settings: Record<string, unknown>;
  position: number;
  created_at: string;
  updated_at: string;
}

export type BoardType =
  | 'notes'
  | 'kanban'
  | 'checklist'
  | 'time_manager'
  | 'calendar'
  | 'habit_tracker';

// Item types (matches backend domain.Item - used for tasks, notes, habits, events)
export interface Item {
  id: string;
  board_id: string;
  parent_id?: string;
  title: string;
  content?: string;
  status: ItemStatus;
  position: number;
  due_date?: string;
  completed_at?: string;
  metadata: ItemMetadata;
  created_at: string;
  updated_at: string;
  children?: Item[];
}

export type ItemStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type ItemPriority = 'low' | 'medium' | 'high' | 'urgent';

// Subtask for checklists
export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// Metadata stored in item.metadata field
export interface ItemMetadata {
  // Task-specific
  priority?: ItemPriority;
  tags?: string[];
  estimated_time?: number;
  time_spent?: number;
  timer_started?: string;

  // Checklist-specific
  subtasks?: Subtask[];

  // Note-specific
  color?: string;
  pinned?: boolean;

  // Habit-specific
  icon?: string;
  frequency?: HabitFrequency;
  target_days?: number[];
  streak?: number;
  longest_streak?: number;

  // Calendar event-specific
  start_date?: string;
  end_date?: string;
  all_day?: boolean;
  reminder?: number;

  // Generic
  [key: string]: unknown;
}

// Legacy aliases for backward compatibility in UI
export type Task = Item;
export type TaskStatus = ItemStatus;
export type TaskPriority = ItemPriority;
export type Note = Item;
export type Habit = Item;
export type CalendarEvent = Item;

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

// Habit completion from backend
export interface HabitCompletion {
  id: string;
  item_id: string;
  completed_date: string;
  created_at: string;
}

// Analytics types (from backend)
export interface AnalyticsOverview {
  total_tasks: number;
  completed_tasks: number;
  pending_tasks: number;
  overdue_tasks: number;
  completion_rate: number;
  total_folders: number;
  total_boards: number;
  active_streaks: number;
  tasks_today: number;
  tasks_this_week: number;
}

export interface CompletionStats {
  date: string;
  completed: number;
  created: number;
}

// For charts - alias for CompletionStats with optional timeSpent
export interface DayStats {
  date: string;
  completed: number;
  created: number;
  timeSpent?: number;
}

// Kanban column types (UI only)
export interface KanbanColumn {
  id: string;
  title: string;
  status: ItemStatus;
  color: string;
}
