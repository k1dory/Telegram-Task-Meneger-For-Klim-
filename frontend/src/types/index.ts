// User types
export interface User {
  id: string;
  telegramId: number;
  username?: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  isPremium: boolean;
  createdAt: string;
  settings: UserSettings;
}

export interface UserSettings {
  theme: 'dark' | 'light' | 'auto';
  notifications: boolean;
  language: string;
  defaultView: 'list' | 'kanban' | 'calendar';
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
  boards?: Array<{
    id: string;
    name: string;
    type: string;
  }>;
}

export type BoardType =
  | 'notes'
  | 'kanban'
  | 'checklist'
  | 'time_manager'
  | 'calendar'
  | 'habit_tracker';

// Task types
export interface Task {
  id: string;
  folderId: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: string;
  reminderAt?: string;
  tags: string[];
  subtasks: Subtask[];
  timeSpent: number;
  estimatedTime?: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'archived';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Subtask {
  id: string;
  title: string;
  completed: boolean;
}

// Note types
export interface Note {
  id: string;
  folderId: string;
  title: string;
  content: string;
  color: string;
  pinned: boolean;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

// Habit types
export interface Habit {
  id: string;
  folderId: string;
  name: string;
  description?: string;
  color: string;
  icon: string;
  frequency: HabitFrequency;
  targetDays: number[];
  streak: number;
  longestStreak: number;
  completions: HabitCompletion[];
  createdAt: string;
}

export type HabitFrequency = 'daily' | 'weekly' | 'monthly';

export interface HabitCompletion {
  date: string;
  completed: boolean;
}

// Time tracking types
export interface TimeEntry {
  id: string;
  taskId: string;
  startTime: string;
  endTime?: string;
  duration: number;
  notes?: string;
}

// Calendar event types
export interface CalendarEvent {
  id: string;
  folderId: string;
  title: string;
  description?: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  color: string;
  reminder?: number;
}

// Kanban column types
export interface KanbanColumn {
  id: string;
  title: string;
  status: TaskStatus;
  color: string;
  taskIds: string[];
}

// Statistics types
export interface Statistics {
  totalTasks: number;
  completedTasks: number;
  totalTimeSpent: number;
  averageCompletionTime: number;
  tasksByStatus: Record<TaskStatus, number>;
  tasksByPriority: Record<TaskPriority, number>;
  completionsByDay: DayStats[];
  habitStats: HabitStats[];
}

export interface DayStats {
  date: string;
  completed: number;
  created: number;
  timeSpent: number;
}

export interface HabitStats {
  habitId: string;
  name: string;
  completionRate: number;
  currentStreak: number;
}

// API Response types
export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}
