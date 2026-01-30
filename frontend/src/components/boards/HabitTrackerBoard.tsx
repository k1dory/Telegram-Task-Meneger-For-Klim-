import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subDays, eachDayOfInterval, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { useHabitsStore, useAppStore } from '@/store';
import { Card, Button, Badge, CircularProgress } from '@/components/ui';
import { HabitHeatmap } from '@/components/charts';
import { cn } from '@/utils';
import type { Habit } from '@/types';

interface HabitTrackerBoardProps {
  folderId: string;
}

const HabitTrackerBoard = ({ folderId }: HabitTrackerBoardProps) => {
  const {
    habits,
    fetchHabits,
    markComplete,
    markIncomplete,
    isCompletedOnDate,
    selectedDate,
    setSelectedDate,
    isLoading,
  } = useHabitsStore();
  const { openModal } = useAppStore();

  useEffect(() => {
    fetchHabits({ folderId });
  }, [folderId, fetchHabits]);

  // Get last 7 days
  const last7Days = eachDayOfInterval({
    start: subDays(new Date(), 6),
    end: new Date(),
  });

  const todayCompletedCount = habits.filter((h) =>
    isCompletedOnDate(h.id, format(new Date(), 'yyyy-MM-dd'))
  ).length;
  const todayProgress = habits.length > 0 ? (todayCompletedCount / habits.length) * 100 : 0;

  const HabitCard = ({ habit }: { habit: Habit }) => {
    const todayStr = format(new Date(), 'yyyy-MM-dd');
    const isCompletedToday = isCompletedOnDate(habit.id, todayStr);

    const handleToggle = () => {
      if (isCompletedToday) {
        markIncomplete(habit.id, todayStr);
      } else {
        markComplete(habit.id, todayStr);
      }
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9 }}
      >
        <Card variant="bordered">
          <div className="flex items-start gap-4">
            {/* Toggle button */}
            <motion.button
              whileTap={{ scale: 0.9 }}
              onClick={handleToggle}
              className={cn(
                'w-12 h-12 rounded-xl flex items-center justify-center transition-all flex-shrink-0',
                isCompletedToday
                  ? 'bg-green-500'
                  : 'bg-dark-700 hover:bg-dark-600'
              )}
              style={!isCompletedToday ? { borderColor: habit.color, borderWidth: 2 } : {}}
            >
              {isCompletedToday ? (
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                <span className="text-xl">{habit.icon || '📌'}</span>
              )}
            </motion.button>

            {/* Habit info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="font-medium text-dark-100">{habit.name}</h3>
                  {habit.description && (
                    <p className="text-sm text-dark-400 mt-0.5">{habit.description}</p>
                  )}
                </div>
                <button
                  onClick={() => openModal('editHabit', habit)}
                  className="p-1.5 rounded-lg hover:bg-dark-700 transition-colors"
                >
                  <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                  </svg>
                </button>
              </div>

              {/* Streak info */}
              <div className="flex items-center gap-4 mt-2">
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-orange-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M12.395 2.553a1 1 0 00-1.45-.385c-.345.23-.614.558-.822.88-.214.33-.403.713-.57 1.116-.334.804-.614 1.768-.84 2.734a31.365 31.365 0 00-.613 3.58 2.64 2.64 0 01-.945-1.067c-.328-.68-.398-1.534-.398-2.654A1 1 0 005.05 6.05 6.981 6.981 0 003 11a7 7 0 1011.95-4.95c-.592-.591-.98-.985-1.348-1.467-.363-.476-.724-1.063-1.207-2.03zM12.12 15.12A3 3 0 017 13s.879.5 2.5.5c0-1 .5-4 1.25-4.5.5 1 .786 1.293 1.371 1.879A2.99 2.99 0 0113 13a2.99 2.99 0 01-.879 2.121z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-orange-400">{habit.streak}</span>
                  <span className="text-xs text-dark-400">дней подряд</span>
                </div>
                <div className="flex items-center gap-1">
                  <svg className="w-4 h-4 text-primary-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                  <span className="text-sm font-medium text-primary-400">{habit.longestStreak}</span>
                  <span className="text-xs text-dark-400">рекорд</span>
                </div>
              </div>

              {/* Last 7 days */}
              <div className="flex gap-1 mt-3">
                {last7Days.map((day) => {
                  const dateStr = format(day, 'yyyy-MM-dd');
                  const completed = isCompletedOnDate(habit.id, dateStr);
                  const isSelectedDay = isToday(day);

                  return (
                    <button
                      key={dateStr}
                      onClick={() => {
                        if (completed) {
                          markIncomplete(habit.id, dateStr);
                        } else {
                          markComplete(habit.id, dateStr);
                        }
                      }}
                      className={cn(
                        'w-8 h-8 rounded-lg flex flex-col items-center justify-center transition-all',
                        completed ? 'bg-green-500' : 'bg-dark-700 hover:bg-dark-600',
                        isSelectedDay && !completed && 'ring-1 ring-primary-500'
                      )}
                    >
                      <span className="text-[10px] text-dark-300">{format(day, 'EE', { locale: ru })}</span>
                      {completed && (
                        <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
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
            <div key={i} className="h-32 bg-dark-800 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Today Overview */}
      <Card variant="gradient">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-dark-50 mb-1">
              {format(new Date(), 'd MMMM', { locale: ru })}
            </h2>
            <p className="text-sm text-dark-400">
              {todayCompletedCount} из {habits.length} привычек выполнено
            </p>
          </div>
          <CircularProgress
            value={todayProgress}
            size={80}
            strokeWidth={8}
            color={todayProgress >= 100 ? 'success' : 'primary'}
          >
            <span className="text-lg font-bold text-dark-50">
              {Math.round(todayProgress)}%
            </span>
          </CircularProgress>
        </div>

        {/* Overall stats */}
        <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-dark-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-dark-50">{habits.length}</p>
            <p className="text-xs text-dark-400">Привычек</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-orange-400">
              {Math.max(...habits.map((h) => h.streak), 0)}
            </p>
            <p className="text-xs text-dark-400">Макс. серия</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-green-400">
              {habits.filter((h) => isCompletedOnDate(h.id, format(new Date(), 'yyyy-MM-dd'))).length}
            </p>
            <p className="text-xs text-dark-400">Сегодня</p>
          </div>
        </div>
      </Card>

      {/* Habits List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-medium text-dark-200">Привычки</h3>
          <Button size="sm" onClick={() => openModal('createHabit', { folderId })}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Добавить
          </Button>
        </div>

        <div className="space-y-3">
          <AnimatePresence>
            {habits.map((habit) => (
              <HabitCard key={habit.id} habit={habit} />
            ))}
          </AnimatePresence>
        </div>

        {habits.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-800 flex items-center justify-center">
              <svg className="w-8 h-8 text-dark-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
              </svg>
            </div>
            <p className="text-dark-400 mb-4">Нет привычек</p>
            <Button onClick={() => openModal('createHabit', { folderId })}>
              Создать привычку
            </Button>
          </div>
        )}
      </div>

      {/* Heatmap for first habit */}
      {habits.length > 0 && (
        <Card variant="bordered">
          <h3 className="font-medium text-dark-200 mb-4">История: {habits[0].name}</h3>
          <HabitHeatmap completions={habits[0].completions} color={habits[0].color} weeks={12} />
        </Card>
      )}
    </div>
  );
};

export default HabitTrackerBoard;
