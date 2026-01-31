import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useTasksStore, useAppStore } from '@/store';
import { Card, Button, Progress, CircularProgress, Badge } from '@/components/ui';
import { useTimer } from '@/hooks';
import { cn, formatDuration, priorityColors } from '@/utils';
import type { Item, ItemPriority } from '@/types';

interface TimeManagerBoardProps {
  boardId: string;
}

const TimeManagerBoard = ({ boardId }: TimeManagerBoardProps) => {
  const { tasks, fetchTasks, updateTask, isLoading } = useTasksStore();
  const { openModal } = useAppStore();
  const [selectedTask, setSelectedTask] = useState<Item | null>(null);
  const [activeTimerTaskId, setActiveTimerTaskId] = useState<string | null>(null);

  const timer = useTimer({
    initialTime: 0,
    autoStart: false,
  });

  useEffect(() => {
    fetchTasks(boardId);
  }, [boardId, fetchTasks]);

  useEffect(() => {
    if (activeTimerTaskId) {
      const task = tasks.find((t) => t.id === activeTimerTaskId);
      setSelectedTask(task || null);
      if (!timer.isRunning) {
        timer.start();
      }
    } else {
      if (timer.isRunning) {
        timer.pause();
        timer.reset(0);
      }
    }
    // Note: timer methods are stable (from useCallback), so we include timer for completeness
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTimerTaskId, tasks, timer.isRunning]);

  const handleStartTimer = (task: Item) => {
    if (activeTimerTaskId) {
      handleStopTimer();
    }
    setSelectedTask(task);
    setActiveTimerTaskId(task.id);
    timer.reset(0);
    timer.start();
  };

  const handleStopTimer = async () => {
    if (selectedTask && timer.time > 0) {
      const currentTimeSpent = selectedTask.metadata?.time_spent || 0;
      const newTimeSpent = currentTimeSpent + Math.floor(timer.time / 60); // Convert to minutes
      await updateTask(selectedTask.id, {
        metadata: { ...selectedTask.metadata, time_spent: newTimeSpent },
      });
    }
    timer.pause();
    setActiveTimerTaskId(null);
    setSelectedTask(null);
    timer.reset(0);
  };

  const activeTasks = tasks.filter((t) => t.status !== 'completed');
  const totalTimeToday = tasks.reduce((sum, t) => sum + (t.metadata?.time_spent || 0), 0);

  // Calculate today's progress (assuming 8 hour workday = 480 minutes)
  const dailyGoal = 480;
  const dailyProgress = Math.min((totalTimeToday / dailyGoal) * 100, 100);

  const TaskTimeCard = ({ task }: { task: Item }) => {
    const isActive = activeTimerTaskId === task.id;
    const timeSpent = task.metadata?.time_spent || 0;
    const estimatedTime = task.metadata?.estimated_time || 0;
    const priority: ItemPriority = task.metadata?.priority || 'medium';
    const progress = estimatedTime
      ? Math.min((timeSpent / estimatedTime) * 100, 100)
      : 0;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ scale: 1.01 }}
      >
        <Card
          variant="bordered"
          className={cn(
            'transition-all duration-300',
            isActive && 'ring-2 ring-primary-500 bg-primary-500/10'
          )}
        >
          <div className="flex items-start gap-4">
            {/* Timer control */}
            <button
              onClick={() => (isActive ? handleStopTimer() : handleStartTimer(task))}
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-all',
                isActive
                  ? 'bg-red-500 hover:bg-red-600'
                  : 'bg-primary-500 hover:bg-primary-600'
              )}
            >
              {isActive ? (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <rect x="6" y="6" width="12" height="12" rx="2" />
                </svg>
              ) : (
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Task info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-dark-100">{task.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: priorityColors[priority] }}
                    />
                    <span className="text-xs text-dark-400">
                      {formatDuration(timeSpent)} потрачено
                    </span>
                    {estimatedTime > 0 && (
                      <>
                        <span className="text-dark-600">/</span>
                        <span className="text-xs text-dark-400">
                          {formatDuration(estimatedTime)} запланировано
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {isActive && (
                  <div className="text-right">
                    <span className="text-2xl font-mono font-bold text-primary-400">
                      {timer.formattedTime}
                    </span>
                    <div className="flex items-center gap-1 text-xs text-primary-400 mt-1">
                      <span className="w-2 h-2 rounded-full bg-primary-400 animate-pulse" />
                      Запись
                    </div>
                  </div>
                )}
              </div>

              {/* Progress bar */}
              {estimatedTime > 0 && (
                <div className="mt-3">
                  <Progress
                    value={progress}
                    size="sm"
                    color={progress > 100 ? 'danger' : progress > 80 ? 'warning' : 'primary'}
                  />
                </div>
              )}
            </div>
          </div>
        </Card>
      </motion.div>
    );
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-40 bg-dark-800 rounded-2xl animate-pulse" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-24 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Daily Overview */}
      <Card variant="gradient">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-50 mb-1">Сегодня</h2>
            <p className="text-sm text-dark-400">
              {formatDuration(totalTimeToday)} из {formatDuration(dailyGoal)}
            </p>
          </div>
          <CircularProgress
            value={dailyProgress}
            size={100}
            strokeWidth={10}
            color={dailyProgress >= 100 ? 'success' : 'primary'}
          >
            <span className="text-lg font-bold text-dark-50">
              {Math.round(dailyProgress)}%
            </span>
          </CircularProgress>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dark-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-50">{activeTasks.length}</p>
            <p className="text-xs text-dark-400">Активных задач</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {tasks.filter((t) => t.status === 'completed').length}
            </p>
            <p className="text-xs text-dark-400">Выполнено</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-primary-400">{formatDuration(totalTimeToday)}</p>
            <p className="text-xs text-dark-400">Время</p>
          </div>
        </div>
      </Card>

      {/* Active Timer */}
      {selectedTask && activeTimerTaskId && (
        <Card variant="bordered" className="bg-primary-500/10 border-primary-500/30">
          <div className="flex items-center justify-between">
            <div>
              <Badge variant="primary" className="mb-2">Активный таймер</Badge>
              <h3 className="font-medium text-dark-100">{selectedTask.title}</h3>
            </div>
            <div className="text-right">
              <span className="text-4xl font-mono font-bold text-primary-400">
                {timer.formattedTime}
              </span>
              <div className="mt-2">
                <Button variant="danger" size="sm" onClick={handleStopTimer}>
                  Остановить
                </Button>
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Task List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-dark-200">Задачи</h3>
          <Button size="sm" onClick={() => openModal('createTask', { boardId })}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить
          </Button>
        </div>

        <div className="space-y-3">
          {activeTasks.map((task) => (
            <TaskTimeCard key={task.id} task={task} />
          ))}
        </div>

        {activeTasks.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-dark-400 mb-4">Нет активных задач</p>
            <Button onClick={() => openModal('createTask', { boardId })}>
              Создать задачу
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TimeManagerBoard;
