import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasksStore, useAppStore } from '@/store';
import { Card, Button, Input, Checkbox, Progress, Badge } from '@/components/ui';
import { cn, priorityColors, priorityLabels, formatRelativeDate, calculateProgress } from '@/utils';
import type { Task } from '@/types';

interface ChecklistBoardProps {
  folderId: string;
}

const ChecklistBoard = ({ folderId }: ChecklistBoardProps) => {
  const { tasks, fetchTasks, updateTaskStatus, toggleSubtask, addSubtask, isLoading } = useTasksStore();
  const { openModal } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [newSubtask, setNewSubtask] = useState<{ [taskId: string]: string }>({});
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    fetchTasks({ folderId });
  }, [folderId, fetchTasks]);

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCompleted = showCompleted || task.status !== 'done';
    return matchesSearch && matchesCompleted;
  });

  const incompleteTasks = filteredTasks.filter((t) => t.status !== 'done');
  const completedTasks = filteredTasks.filter((t) => t.status === 'done');

  const handleTaskToggle = (task: Task) => {
    const newStatus = task.status === 'done' ? 'todo' : 'done';
    updateTaskStatus(task.id, newStatus);
  };

  const handleAddSubtask = (taskId: string) => {
    const title = newSubtask[taskId]?.trim();
    if (title) {
      addSubtask(taskId, title);
      setNewSubtask((prev) => ({ ...prev, [taskId]: '' }));
    }
  };

  const TaskItem = ({ task }: { task: Task }) => {
    const isCompleted = task.status === 'done';
    const subtaskProgress = calculateProgress(
      task.subtasks.filter((s) => s.completed).length,
      task.subtasks.length
    );

    return (
      <motion.div
        layout
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 20 }}
      >
        <Card variant="bordered" className={cn(isCompleted && 'opacity-60')}>
          <div className="flex items-start gap-3">
            <Checkbox
              checked={isCompleted}
              onChange={() => handleTaskToggle(task)}
              className="mt-1"
            />

            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <h3
                  className={cn(
                    'font-medium text-dark-100',
                    isCompleted && 'line-through text-dark-400'
                  )}
                >
                  {task.title}
                </h3>
                <button
                  onClick={() => openModal('editTask', task)}
                  className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors flex-shrink-0"
                >
                  <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>

              {task.description && (
                <p className="text-sm text-dark-400 mt-1 line-clamp-2">{task.description}</p>
              )}

              {/* Metadata */}
              <div className="flex flex-wrap items-center gap-2 mt-2">
                <Badge
                  variant={
                    task.priority === 'urgent'
                      ? 'danger'
                      : task.priority === 'high'
                      ? 'warning'
                      : 'default'
                  }
                  size="sm"
                >
                  {priorityLabels[task.priority]}
                </Badge>

                {task.dueDate && (
                  <span className="text-xs text-dark-400 flex items-center gap-1">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    {formatRelativeDate(task.dueDate)}
                  </span>
                )}
              </div>

              {/* Subtasks */}
              {task.subtasks.length > 0 && (
                <div className="mt-3 pt-3 border-t border-dark-700">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-dark-400">
                      Подзадачи ({task.subtasks.filter((s) => s.completed).length}/{task.subtasks.length})
                    </span>
                    <span className="text-xs text-dark-400">{subtaskProgress}%</span>
                  </div>
                  <Progress value={subtaskProgress} size="sm" color="primary" />

                  <div className="mt-2 space-y-1">
                    {task.subtasks.map((subtask) => (
                      <div key={subtask.id} className="flex items-center gap-2">
                        <Checkbox
                          checked={subtask.completed}
                          onChange={() => toggleSubtask(task.id, subtask.id, !subtask.completed)}
                        />
                        <span
                          className={cn(
                            'text-sm',
                            subtask.completed ? 'text-dark-500 line-through' : 'text-dark-200'
                          )}
                        >
                          {subtask.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add subtask */}
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="Добавить подзадачу..."
                  value={newSubtask[task.id] || ''}
                  onChange={(e) =>
                    setNewSubtask((prev) => ({ ...prev, [task.id]: e.target.value }))
                  }
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSubtask(task.id)}
                  className="text-sm"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleAddSubtask(task.id)}
                  disabled={!newSubtask[task.id]?.trim()}
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </Button>
              </div>
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Поиск задач..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        <div className="flex gap-2">
          <Button
            variant={showCompleted ? 'secondary' : 'ghost'}
            onClick={() => setShowCompleted(!showCompleted)}
          >
            {showCompleted ? 'Скрыть выполненные' : 'Показать выполненные'}
          </Button>
          <Button onClick={() => openModal('createTask', { folderId })}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-32 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          {/* Incomplete Tasks */}
          <div className="space-y-3">
            <AnimatePresence>
              {incompleteTasks.map((task) => (
                <TaskItem key={task.id} task={task} />
              ))}
            </AnimatePresence>
          </div>

          {/* Completed Tasks */}
          {showCompleted && completedTasks.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-dark-400 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Выполнено ({completedTasks.length})
              </h3>
              <AnimatePresence>
                {completedTasks.map((task) => (
                  <TaskItem key={task.id} task={task} />
                ))}
              </AnimatePresence>
            </div>
          )}

          {/* Empty State */}
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
                <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                </svg>
              </div>
              <p className="text-dark-400 mb-4">Нет задач</p>
              <Button onClick={() => openModal('createTask', { folderId })}>
                Создать задачу
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ChecklistBoard;
