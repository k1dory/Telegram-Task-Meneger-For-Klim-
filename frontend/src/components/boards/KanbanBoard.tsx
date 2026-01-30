import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTasksStore, useAppStore } from '@/store';
import { Card, Badge } from '@/components/ui';
import { cn, statusColors, priorityColors, formatRelativeDate } from '@/utils';
import type { Item, ItemStatus } from '@/types';

interface KanbanBoardProps {
  boardId: string;
}

const columns: { id: ItemStatus; title: string }[] = [
  { id: 'pending', title: 'К выполнению' },
  { id: 'in_progress', title: 'В работе' },
  { id: 'completed', title: 'Выполнено' },
];

const KanbanBoard = ({ boardId }: KanbanBoardProps) => {
  const { tasks, fetchTasks, completeTask, updateTask, isLoading } = useTasksStore();
  const { openModal } = useAppStore();
  const [draggedTask, setDraggedTask] = useState<Item | null>(null);

  useEffect(() => {
    fetchTasks(boardId);
  }, [boardId, fetchTasks]);

  const getTasksByStatus = (status: ItemStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (task: Item) => {
    setDraggedTask(task);
  };

  const handleDragEnd = () => {
    setDraggedTask(null);
  };

  const handleDrop = async (status: ItemStatus) => {
    if (draggedTask && draggedTask.status !== status) {
      if (status === 'completed') {
        // Use complete endpoint to properly set completed_at
        await completeTask(draggedTask.id, true);
      } else if (draggedTask.status === 'completed') {
        // Moving from completed - uncomplete
        await completeTask(draggedTask.id, false);
        // Then update status
        await updateTask(draggedTask.id, { status });
      } else {
        // Just update status
        await updateTask(draggedTask.id, { status });
      }
    }
    setDraggedTask(null);
  };

  const TaskCard = ({ task }: { task: Item }) => {
    const priority = task.metadata?.priority || 'medium';
    const tags = task.metadata?.tags || [];

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        draggable
        onDragStart={() => handleDragStart(task)}
        onDragEnd={handleDragEnd}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => openModal('editTask', task)}
        className="cursor-pointer"
      >
        <Card variant="bordered" padding="sm" className="bg-dark-900">
          <div className="flex items-start gap-2 mb-2">
            <div
              className="w-2 h-2 rounded-full mt-1.5 flex-shrink-0"
              style={{ backgroundColor: priorityColors[priority] }}
            />
            <h4 className="text-sm font-medium text-dark-100 line-clamp-2">{task.title}</h4>
          </div>

          {task.content && (
            <p className="text-xs text-dark-500 line-clamp-2 mb-2 ml-4">
              {task.content}
            </p>
          )}

          <div className="flex items-center justify-between ml-4">
            <div className="flex items-center gap-2">
              {task.due_date && (
                <span className="text-xs text-dark-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                    />
                  </svg>
                  {formatRelativeDate(task.due_date)}
                </span>
              )}
            </div>
          </div>

          {tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2 ml-4">
              {tags.slice(0, 2).map((tag) => (
                <Badge key={tag} variant="default" size="sm">
                  {tag}
                </Badge>
              ))}
            </div>
          )}
        </Card>
      </motion.div>
    );
  };

  const Column = ({ status, title }: { status: ItemStatus; title: string }) => {
    const columnTasks = getTasksByStatus(status);
    const [isOver, setIsOver] = useState(false);

    return (
      <div
        className={cn(
          'flex flex-col min-w-[280px] w-full lg:w-1/4',
          'bg-dark-800/50 rounded-2xl p-3 transition-colors',
          isOver && draggedTask && 'bg-primary-500/10 ring-2 ring-primary-500/30'
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setIsOver(true);
        }}
        onDragLeave={() => setIsOver(false)}
        onDrop={() => {
          handleDrop(status);
          setIsOver(false);
        }}
      >
        {/* Column Header */}
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: statusColors[status] }}
            />
            <h3 className="font-medium text-dark-200">{title}</h3>
            <span className="text-xs text-dark-500 bg-dark-700 px-2 py-0.5 rounded-full">
              {columnTasks.length}
            </span>
          </div>
          <button
            onClick={() => openModal('createTask', { boardId, status })}
            className="p-1 rounded-lg hover:bg-dark-700 transition-colors"
          >
            <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* Tasks */}
        <div className="flex-1 space-y-2 min-h-[200px]">
          <AnimatePresence>
            {columnTasks.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </AnimatePresence>

          {columnTasks.length === 0 && (
            <div className="flex items-center justify-center h-20 border-2 border-dashed border-dark-700 rounded-xl">
              <p className="text-sm text-dark-500">Перетащите сюда</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {columns.map((col) => (
          <div key={col.id} className="min-w-[280px] w-full lg:w-1/4 bg-dark-800/50 rounded-2xl p-3">
            <div className="h-8 bg-dark-700 rounded-lg mb-3 animate-pulse" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 bg-dark-700 rounded-xl animate-pulse" />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
      {columns.map((col) => (
        <Column key={col.id} status={col.id} title={col.title} />
      ))}
    </div>
  );
};

export default KanbanBoard;
