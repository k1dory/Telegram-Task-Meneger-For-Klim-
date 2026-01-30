export { default as apiClient } from './client';
export { default as authApi } from './auth';
export { default as foldersApi } from './folders';
export { default as boardsApi } from './boards';
export { default as itemsApi } from './items';
export { default as tasksApi } from './tasks';
export { default as notesApi } from './notes';
export { default as habitsApi } from './habits';
export { default as calendarApi } from './calendar';
export { default as statsApi } from './stats';

// Re-export types
export type { CreateFolderDto, UpdateFolderDto } from './folders';
export type { Board, CreateBoardDto, UpdateBoardDto } from './boards';
export type { Item, CreateItemDto, UpdateItemDto, ItemFilters } from './items';
export type { CreateTaskDto, UpdateTaskDto, TaskFilters } from './tasks';
export type { CreateNoteDto, UpdateNoteDto, NoteFilters } from './notes';
export type { CreateHabitDto, UpdateHabitDto, HabitFilters } from './habits';
export type { CreateEventDto, UpdateEventDto, EventFilters } from './calendar';
export type { StatsFilters } from './stats';
