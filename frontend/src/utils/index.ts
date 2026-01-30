import { clsx, type ClassValue } from 'clsx';
import { format, formatDistanceToNow, isToday, isTomorrow, isYesterday, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';

// Classname utility
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// Date formatting utilities
export function formatDate(date: string | Date, formatStr: string = 'dd MMM yyyy'): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, formatStr, { locale: ru });
}

export function formatRelativeDate(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;

  if (isToday(d)) return 'Сегодня';
  if (isTomorrow(d)) return 'Завтра';
  if (isYesterday(d)) return 'Вчера';

  return formatDistanceToNow(d, { addSuffix: true, locale: ru });
}

export function formatTime(date: string | Date): string {
  const d = typeof date === 'string' ? parseISO(date) : date;
  return format(d, 'HH:mm');
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}м`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}ч ${mins}м` : `${hours}ч`;
}

// Color utilities
export function hexToRgba(hex: string, alpha: number = 1): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.5 ? '#000000' : '#ffffff';
}

// Priority colors
export const priorityColors = {
  low: '#22c55e',
  medium: '#eab308',
  high: '#f97316',
  urgent: '#ef4444',
} as const;

export const priorityLabels = {
  low: 'Низкий',
  medium: 'Средний',
  high: 'Высокий',
  urgent: 'Срочный',
} as const;

// Status colors - updated to match TaskStatus enum
export const statusColors = {
  'pending': '#94a3b8',
  'in_progress': '#3b82f6',
  'completed': '#22c55e',
  'archived': '#6b7280',
} as const;

export const statusLabels = {
  'pending': 'К выполнению',
  'in_progress': 'В работе',
  'completed': 'Выполнено',
  'archived': 'В архиве',
} as const;

// Board type labels - updated to match BoardType enum
export const boardTypeLabels = {
  'notes': 'Заметки',
  'kanban': 'Kanban',
  'checklist': 'Чеклист',
  'time_manager': 'Время',
  'calendar': 'Календарь',
  'habit_tracker': 'Привычки',
} as const;

export const boardTypeIcons = {
  'notes': 'FileText',
  'kanban': 'Columns',
  'checklist': 'CheckSquare',
  'time_manager': 'Clock',
  'calendar': 'Calendar',
  'habit_tracker': 'Target',
} as const;

// Generate unique ID
export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Debounce function
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: ReturnType<typeof setTimeout> | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Throttle function
export function throttle<T extends (...args: unknown[]) => unknown>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle: boolean;

  return function executedFunction(...args: Parameters<T>) {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// Local storage helpers
export function getStorageItem<T>(key: string, defaultValue: T): T {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch {
    return defaultValue;
  }
}

export function setStorageItem<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error saving to localStorage:', error);
  }
}

// Calculate completion percentage
export function calculateProgress(completed: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}

// Group array by key
export function groupBy<T, K extends keyof T>(array: T[], key: K): Record<string, T[]> {
  return array.reduce((result, item) => {
    const groupKey = String(item[key]);
    (result[groupKey] = result[groupKey] || []).push(item);
    return result;
  }, {} as Record<string, T[]>);
}

// Sort tasks by priority
export function sortByPriority<T extends { priority: string }>(items: T[]): T[] {
  const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
  return [...items].sort(
    (a, b) =>
      (priorityOrder[a.priority as keyof typeof priorityOrder] || 4) -
      (priorityOrder[b.priority as keyof typeof priorityOrder] || 4)
  );
}

// Haptic feedback
export function hapticFeedback(type: 'light' | 'medium' | 'heavy' | 'success' | 'error' = 'light'): void {
  if (window.Telegram?.WebApp?.HapticFeedback) {
    const impact = type === 'success' || type === 'error' ? 'notification' : 'impact';
    if (impact === 'notification') {
      window.Telegram.WebApp.HapticFeedback.notificationOccurred(type as 'success' | 'error');
    } else {
      window.Telegram.WebApp.HapticFeedback.impactOccurred(type as 'light' | 'medium' | 'heavy');
    }
  }
}
