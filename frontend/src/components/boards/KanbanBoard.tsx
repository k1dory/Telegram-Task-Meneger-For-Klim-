import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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

// Sortable Task Card
const SortableTaskCard = ({ task, onClick }: { task: Item; onClick: () => void }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const priority = task.metadata?.priority || 'medium';
  const tags = task.metadata?.tags || [];

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        'cursor-grab active:cursor-grabbing touch-none',
        isDragging && 'opacity-50'
      )}
    >
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
        onClick={onClick}
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
    </div>
  );
};

// Task Card for Drag Overlay
const TaskCardOverlay = ({ task }: { task: Item }) => {
  const priority = task.metadata?.priority || 'medium';

  return (
    <div className="w-[280px]">
      <Card variant="bordered" padding="sm" className="bg-dark-900 shadow-2xl scale-105">
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
      </Card>
    </div>
  );
};

// Droppable Column
const Column = ({
  status,
  title,
  tasks,
  onAddTask,
  onTaskClick,
}: {
  status: ItemStatus;
  title: string;
  tasks: Item[];
  onAddTask: () => void;
  onTaskClick: (task: Item) => void;
}) => {
  return (
    <div
      className={cn(
        'flex flex-col min-w-[280px] w-full lg:w-1/4',
        'bg-dark-800/50 rounded-2xl p-3'
      )}
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
            {tasks.length}
          </span>
        </div>
        <button
          onClick={onAddTask}
          className="p-1 rounded-lg hover:bg-dark-700 transition-colors"
        >
          <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>

      {/* Tasks */}
      <SortableContext items={tasks.map(t => t.id)} strategy={verticalListSortingStrategy}>
        <div className="flex-1 space-y-2 min-h-[200px]">
          <AnimatePresence>
            {tasks.map((task) => (
              <SortableTaskCard
                key={task.id}
                task={task}
                onClick={() => onTaskClick(task)}
              />
            ))}
          </AnimatePresence>

          {tasks.length === 0 && (
            <div className="flex items-center justify-center h-20 border-2 border-dashed border-dark-700 rounded-xl">
              <p className="text-sm text-dark-500">Перетащите сюда</p>
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  );
};

const KanbanBoard = ({ boardId }: KanbanBoardProps) => {
  const { tasks, fetchTasks, completeTask, updateTask, isLoading } = useTasksStore();
  const { openModal } = useAppStore();
  const [activeTask, setActiveTask] = useState<Item | null>(null);

  // Configure sensors for mouse, touch, and keyboard
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(TouchSensor, {
      activationConstraint: {
        delay: 200, // 200ms press delay
        tolerance: 5, // 5px movement tolerance
      },
    }),
    useSensor(KeyboardSensor)
  );

  useEffect(() => {
    fetchTasks(boardId);
  }, [boardId, fetchTasks]);

  const getTasksByStatus = (status: ItemStatus) => {
    return tasks.filter((task) => task.status === status);
  };

  const handleDragStart = (event: DragStartEvent) => {
    const task = tasks.find((t) => t.id === event.active.id);
    if (task) {
      setActiveTask(task);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveTask(null);

    if (!over) return;

    const taskId = active.id as string;
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;

    // Determine target status from the over element
    // The over.id could be a task id or we need to check data
    let targetStatus: ItemStatus | null = null;

    // Check if dropped over another task
    const overTask = tasks.find((t) => t.id === over.id);
    if (overTask) {
      targetStatus = overTask.status;
    } else {
      // Check if dropped over a column (over.id might be the column id)
      const isColumn = columns.some((c) => c.id === over.id);
      if (isColumn) {
        targetStatus = over.id as ItemStatus;
      }
    }

    if (targetStatus && task.status !== targetStatus) {
      if (targetStatus === 'completed') {
        await completeTask(task.id, true);
      } else if (task.status === 'completed') {
        await completeTask(task.id, false);
        await updateTask(task.id, { status: targetStatus });
      } else {
        await updateTask(task.id, { status: targetStatus });
      }
    }
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
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4">
        {columns.map((col) => (
          <Column
            key={col.id}
            status={col.id}
            title={col.title}
            tasks={getTasksByStatus(col.id)}
            onAddTask={() => openModal('createTask', { boardId, status: col.id })}
            onTaskClick={(task) => openModal('editTask', task)}
          />
        ))}
      </div>

      {/* Drag Overlay - shows the dragged item */}
      <DragOverlay>
        {activeTask ? <TaskCardOverlay task={activeTask} /> : null}
      </DragOverlay>
    </DndContext>
  );
};

export default KanbanBoard;
