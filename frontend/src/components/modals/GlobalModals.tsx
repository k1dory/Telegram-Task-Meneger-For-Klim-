import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore, useTasksStore, useNotesStore, useCalendarStore, useHabitsStore, useFoldersStore } from '@/store';
import { boardsApi } from '@/api';
import { Modal, Button, Input, Select } from '@/components/ui';
import type { Item, ItemPriority, Board, BoardType } from '@/types';
import { boardTypeLabels } from '@/utils';

// Convert YYYY-MM-DD (HTML input) to backend ISO string (RFC3339)
// Use local noon to avoid timezone date shifts near midnight.
const toBackendDate = (htmlDate: string): string => {
  if (!htmlDate) return '';
  const local = new Date(`${htmlDate}T12:00:00`);
  if (Number.isNaN(local.getTime())) return '';
  return local.toISOString();
};

// Convert ISO or legacy DD.MM.YYYY to YYYY-MM-DD (for HTML input)
const toHtmlDate = (date: string | undefined): string => {
  if (!date) return '';
  if (date.includes('T')) {
    return date.split('T')[0];
  }
  if (date.includes('.')) {
    const [day, month, year] = date.split('.');
    return `${year}-${month}-${day}`;
  }
  return date;
};

// Task Form Modal
const TaskFormModal = () => {
  const { activeModal, modalData, closeModal } = useAppStore();
  const { createTask, updateTask } = useTasksStore();
  const isOpen = activeModal === 'createTask' || activeModal === 'editTask';
  const isEdit = activeModal === 'editTask';
  const task = isEdit ? (modalData as Item) : null;
  const data = modalData as { boardId?: string; status?: string } | Item | null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<ItemPriority>('medium');
  const [dueDate, setDueDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isEdit && task) {
      setTitle(task.title);
      setContent(task.content || '');
      setPriority(task.metadata?.priority || 'medium');
      setDueDate(toHtmlDate(task.due_date));
    } else {
      setTitle('');
      setContent('');
      setPriority('medium');
      setDueDate('');
    }
  }, [isEdit, task, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      if (isEdit && task) {
        await updateTask(task.id, {
          title,
          content,
          due_date: toBackendDate(dueDate) || undefined,
          metadata: { ...task.metadata, priority },
        });
      } else {
        const boardId = (data as { boardId?: string })?.boardId;
        const status = (data as { status?: string })?.status || 'pending';
        if (boardId) {
          await createTask(boardId, {
            title,
            content,
            status: status as 'pending' | 'in_progress' | 'completed',
            due_date: toBackendDate(dueDate) || undefined,
            metadata: { priority },
          });
        }
      }
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? 'Редактировать задачу' : 'Новая задача'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите название задачи"
          autoFocus
        />
        <Input
          label="Описание"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Описание (необязательно)"
        />
        <Select
          label="Приоритет"
          value={priority}
          onChange={(v) => setPriority(v as ItemPriority)}
          options={[
            { value: 'low', label: 'Низкий' },
            { value: 'medium', label: 'Средний' },
            { value: 'high', label: 'Высокий' },
            { value: 'urgent', label: 'Срочный' },
          ]}
        />
        <Input
          label="Срок выполнения"
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
        />
      </div>
    </Modal>
  );
};

// Note Form Modal
const NoteFormModal = () => {
  const { activeModal, modalData, closeModal } = useAppStore();
  const { createNote, updateNote } = useNotesStore();
  const isOpen = activeModal === 'createNote' || activeModal === 'editNote';
  const isEdit = activeModal === 'editNote';
  const note = isEdit ? (modalData as Item) : null;
  const data = modalData as { boardId?: string } | Item | null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  useEffect(() => {
    if (isEdit && note) {
      setTitle(note.title);
      setContent(note.content || '');
      setColor(note.metadata?.color || '#6366f1');
    } else {
      setTitle('');
      setContent('');
      setColor('#6366f1');
    }
  }, [isEdit, note, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      if (isEdit && note) {
        await updateNote(note.id, {
          title,
          content,
          metadata: { ...note.metadata, color },
        });
      } else {
        const boardId = (data as { boardId?: string })?.boardId;
        if (boardId) {
          await createNote(boardId, {
            title,
            content,
            metadata: { color },
          });
        }
      }
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? 'Редактировать заметку' : 'Новая заметка'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Заголовок"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите заголовок"
          autoFocus
        />
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Содержание</label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="Текст заметки..."
            className="w-full px-4 py-3 bg-dark-700 border border-dark-600 rounded-xl text-dark-100 placeholder-dark-500 focus:outline-none focus:ring-2 focus:ring-primary-500 min-h-[120px] resize-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Цвет</label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Habit Form Modal
const HabitFormModal = () => {
  const { activeModal, modalData, closeModal } = useAppStore();
  const { createHabit, updateHabit } = useHabitsStore();
  const isOpen = activeModal === 'createHabit' || activeModal === 'editHabit';
  const isEdit = activeModal === 'editHabit';
  const habit = isEdit ? (modalData as Item) : null;
  const data = modalData as { boardId?: string } | Item | null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [icon, setIcon] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const icons = ['', '💪', '📚', '🏃', '💧', '🧘', '✍️', '🎯', '💤'];
  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  useEffect(() => {
    if (isEdit && habit) {
      setTitle(habit.title);
      setContent(habit.content || '');
      setIcon(habit.metadata?.icon || '');
      setColor(habit.metadata?.color || '#6366f1');
    } else {
      setTitle('');
      setContent('');
      setIcon('');
      setColor('#6366f1');
    }
  }, [isEdit, habit, isOpen]);

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setIsSubmitting(true);

    try {
      if (isEdit && habit) {
        await updateHabit(habit.id, {
          title,
          content,
          metadata: { ...habit.metadata, icon, color },
        });
      } else {
        const boardId = (data as { boardId?: string })?.boardId;
        if (boardId) {
          await createHabit(boardId, {
            title,
            content,
            metadata: { icon, color, streak: 0, longest_streak: 0 },
          });
        }
      }
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? 'Редактировать привычку' : 'Новая привычка'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Например: Утренняя зарядка"
          autoFocus
        />
        <Input
          label="Описание"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Описание (необязательно)"
        />
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Иконка</label>
          <div className="flex gap-2 flex-wrap">
            {icons.map((i) => (
              <button
                key={i || 'none'}
                onClick={() => setIcon(i)}
                className={`w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl transition-all ${icon === i ? 'ring-2 ring-primary-500' : ''}`}
              >
                {i || '📌'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Цвет</label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Event Form Modal
const EventFormModal = () => {
  const { activeModal, modalData, closeModal } = useAppStore();
  const { createEvent, updateEvent } = useCalendarStore();
  const isOpen = activeModal === 'createEvent' || activeModal === 'editEvent';
  const isEdit = activeModal === 'editEvent';
  const event = isEdit ? (modalData as Item) : null;
  const data = modalData as { boardId?: string; startDate?: Date } | Item | null;

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [allDay, setAllDay] = useState(false);
  const [color, setColor] = useState('#6366f1');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6'];

  useEffect(() => {
    if (isEdit && event) {
      setTitle(event.title);
      setContent(event.content || '');
      const start = event.metadata?.start_date || event.due_date;
      const end = event.metadata?.end_date;
      setStartDate(toHtmlDate(start));
      setEndDate(toHtmlDate(end));
      setAllDay(event.metadata?.all_day || false);
      setColor(event.metadata?.color || '#6366f1');
    } else {
      const initialDate = (data as { startDate?: Date })?.startDate;
      setTitle('');
      setContent('');
      setStartDate(initialDate ? initialDate.toISOString().split('T')[0] : '');
      setEndDate('');
      setAllDay(false);
      setColor('#6366f1');
    }
  }, [isEdit, event, isOpen, data]);

  const handleSubmit = async () => {
    if (!title.trim() || !startDate) return;
    setIsSubmitting(true);

    const backendStartDate = toBackendDate(startDate);

    try {
      if (isEdit && event) {
        await updateEvent(event.id, {
          title,
          content,
          due_date: backendStartDate,
          metadata: {
            ...event.metadata,
            start_date: startDate,
            end_date: endDate || startDate,
            all_day: allDay,
            color,
          },
        });
      } else {
        const boardId = (data as { boardId?: string })?.boardId;
        if (boardId) {
          await createEvent(boardId, {
            title,
            content,
            due_date: backendStartDate,
            metadata: {
              start_date: startDate,
              end_date: endDate || startDate,
              all_day: allDay,
              color,
            },
          });
        }
      }
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? 'Редактировать событие' : 'Новое событие'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || !startDate || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Введите название события"
          autoFocus
        />
        <Input
          label="Описание"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Описание (необязательно)"
        />
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Начало"
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
          />
          <Input
            label="Окончание"
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={allDay}
            onChange={(e) => setAllDay(e.target.checked)}
            className="w-5 h-5 rounded bg-dark-700 border-dark-600 text-primary-500"
          />
          <span className="text-sm text-dark-200">Весь день</span>
        </label>
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Цвет</label>
          <div className="flex gap-2">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Folder Form Modal
const FolderFormModal = () => {
  const { activeModal, modalData, closeModal } = useAppStore();
  const { currentFolder, createFolder, updateFolder } = useFoldersStore();
  const isOpen = activeModal === 'createFolder' || activeModal === 'editFolder';
  const isEdit = activeModal === 'editFolder';

  const [name, setName] = useState('');
  const [color, setColor] = useState('#6366f1');
  const [icon, setIcon] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const colors = ['#6366f1', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ef4444', '#14b8a6'];
  const icons = ['', '📁', '📋', '📝', '💼', '🏠', '🎯', '💡', '📚'];

  useEffect(() => {
    if (isEdit && currentFolder) {
      setName(currentFolder.name);
      setColor(currentFolder.color);
      setIcon(currentFolder.icon || '');
    } else {
      setName('');
      setColor('#6366f1');
      setIcon('');
    }
  }, [isEdit, currentFolder, isOpen]);

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setIsSubmitting(true);

    try {
      if (isEdit && currentFolder) {
        await updateFolder(currentFolder.id, { name, color, icon: icon || undefined });
      } else {
        await createFolder({ name, color, icon: icon || undefined });
      }
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title={isEdit ? 'Редактировать папку' : 'Новая папка'}
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : isEdit ? 'Сохранить' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Введите название папки"
          autoFocus
        />
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Иконка</label>
          <div className="flex gap-2 flex-wrap">
            {icons.map((i) => (
              <button
                key={i || 'none'}
                onClick={() => setIcon(i)}
                className={`w-10 h-10 rounded-xl bg-dark-700 flex items-center justify-center text-xl transition-all ${icon === i ? 'ring-2 ring-primary-500' : ''}`}
              >
                {i || '📁'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-dark-200 mb-2">Цвет</label>
          <div className="flex gap-2 flex-wrap">
            {colors.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-8 h-8 rounded-full transition-transform ${color === c ? 'scale-125 ring-2 ring-white' : ''}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

// Board Form Modal
const BoardFormModal = () => {
  const { activeModal, closeModal } = useAppStore();
  const { currentFolder, fetchFolderById } = useFoldersStore();
  const isOpen = activeModal === 'createBoard';
  const [name, setName] = useState('');
  const [type, setType] = useState<BoardType>('kanban');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const boardTypeOptions = (Object.entries(boardTypeLabels) as [BoardType, string][])
    .map(([value, label]) => ({ value, label }));

  useEffect(() => {
    if (isOpen) {
      setName('');
      setType('kanban');
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!name.trim() || !currentFolder) return;
    setIsSubmitting(true);

    try {
      await boardsApi.create(currentFolder.id, { name, type, settings: {} });
      await fetchFolderById(currentFolder.id);
      closeModal();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Новая доска"
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button onClick={handleSubmit} disabled={!name.trim() || isSubmitting}>
            {isSubmitting ? 'Сохранение...' : 'Создать'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        <Input
          label="Название"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Например: Личные задачи"
          autoFocus
        />
        <Select
          label="Тип доски"
          value={type}
          onChange={(value) => setType(value as BoardType)}
          options={boardTypeOptions}
        />
      </div>
    </Modal>
  );
};

// Delete Folder Modal
const DeleteFolderModal = () => {
  const navigate = useNavigate();
  const { activeModal, closeModal } = useAppStore();
  const { currentFolder, deleteFolder } = useFoldersStore();
  const isOpen = activeModal === 'deleteFolder';
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleDelete = async () => {
    if (!currentFolder) return;
    setIsSubmitting(true);
    try {
      await deleteFolder(currentFolder.id);
      closeModal();
      navigate('/folders');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Удалить папку?"
      footer={
        <>
          <Button variant="ghost" onClick={closeModal}>Отмена</Button>
          <Button variant="danger" onClick={handleDelete} disabled={isSubmitting}>
            {isSubmitting ? 'Удаление...' : 'Удалить'}
          </Button>
        </>
      }
    >
      <p className="text-dark-300">
        Вы уверены, что хотите удалить папку "{currentFolder?.name}"? Все задачи и заметки в ней будут удалены безвозвратно.
      </p>
    </Modal>
  );
};

type TaskBoardOption = Board & { folderName: string; folderColor: string };

// Select Board Modal (when no lastActiveBoardId)
const SelectBoardModal = () => {
  const { activeModal, closeModal, openModal, setLastActiveBoardId } = useAppStore();
  const { folders, fetchFolders } = useFoldersStore();
  const isOpen = activeModal === 'selectBoardForCreate';
  const [taskBoards, setTaskBoards] = useState<TaskBoardOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && folders.length === 0) {
      fetchFolders();
    }
  }, [isOpen, folders.length, fetchFolders]);

  useEffect(() => {
    let cancelled = false;

    const loadBoards = async () => {
      if (!isOpen) return;
      if (folders.length === 0) {
        setTaskBoards([]);
        return;
      }

      setIsLoading(true);
      try {
        const boardGroups = await Promise.all(
          folders.map(async (folder) => {
            const boards = await boardsApi.getByFolder(folder.id);
            return boards
              .filter((b) => ['kanban', 'checklist', 'time_manager'].includes(b.type))
              .map((b) => ({
                ...b,
                folderName: folder.name,
                folderColor: folder.color,
              }));
          })
        );

        if (!cancelled) {
          setTaskBoards(boardGroups.flat());
        }
      } catch {
        if (!cancelled) {
          setTaskBoards([]);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    loadBoards();
    return () => {
      cancelled = true;
    };
  }, [isOpen, folders]);

  const handleSelectBoard = (boardId: string) => {
    setLastActiveBoardId(boardId);
    closeModal();
    openModal('createTask', { boardId });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={closeModal}
      title="Выберите доску"
    >
      <div className="space-y-2 max-h-[60vh] overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-14 rounded-xl bg-dark-700/70 animate-pulse" />
            ))}
          </div>
        ) : taskBoards.length === 0 ? (
          <p className="text-dark-400 text-center py-4">
            Нет досок для создания задач. Создайте папку с доской типа Kanban, Checklist или Time Manager.
          </p>
        ) : (
          taskBoards.map((board) => (
            <button
              key={board.id}
              onClick={() => handleSelectBoard(board.id)}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-dark-700 hover:bg-dark-600 transition-colors text-left"
            >
              <span
                className="w-3 h-3 rounded-full flex-shrink-0"
                style={{ backgroundColor: board.folderColor }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-dark-100 font-medium truncate">{board.name}</p>
                <p className="text-dark-400 text-sm truncate">{board.folderName}</p>
              </div>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
};

// Global Modals Container
const GlobalModals = () => {
  return (
    <>
      <TaskFormModal />
      <NoteFormModal />
      <HabitFormModal />
      <EventFormModal />
      <FolderFormModal />
      <BoardFormModal />
      <DeleteFolderModal />
      <SelectBoardModal />
    </>
  );
};

export default GlobalModals;
