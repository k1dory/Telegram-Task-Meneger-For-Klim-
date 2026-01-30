import { useMemo } from 'react';
import { format, eachDayOfInterval, subDays, startOfWeek } from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/utils';
import type { HabitCompletion } from '@/types';

interface HabitHeatmapProps {
  completions: HabitCompletion[];
  weeks?: number;
  color?: string;
}

const HabitHeatmap = ({ completions, weeks = 12, color = '#8b5cf6' }: HabitHeatmapProps) => {
  const days = useMemo(() => {
    const endDate = new Date();
    const startDate = startOfWeek(subDays(endDate, weeks * 7), { weekStartsOn: 1 });
    return eachDayOfInterval({ start: startDate, end: endDate });
  }, [weeks]);

  const completionMap = useMemo(() => {
    const map = new Map<string, boolean>();
    // Each HabitCompletion record represents a completed day
    completions.forEach((c) => map.set(c.completed_date, true));
    return map;
  }, [completions]);

  const weekDays = ['Пн', '', 'Ср', '', 'Пт', '', ''];

  // Group days by week
  const weeksData = useMemo(() => {
    const result: Date[][] = [];
    let currentWeek: Date[] = [];

    days.forEach((day, index) => {
      currentWeek.push(day);
      if (currentWeek.length === 7 || index === days.length - 1) {
        result.push(currentWeek);
        currentWeek = [];
      }
    });

    return result;
  }, [days]);

  const getOpacity = (isCompleted: boolean) => {
    return isCompleted ? 1 : 0.1;
  };

  return (
    <div className="flex gap-1">
      {/* Week day labels */}
      <div className="flex flex-col gap-1 pr-2">
        {weekDays.map((day, i) => (
          <div key={i} className="h-3 text-[10px] text-dark-500 leading-3">
            {day}
          </div>
        ))}
      </div>

      {/* Heatmap grid */}
      <div className="flex gap-1 overflow-x-auto">
        {weeksData.map((week, weekIndex) => (
          <div key={weekIndex} className="flex flex-col gap-1">
            {week.map((day) => {
              const dateStr = format(day, 'yyyy-MM-dd');
              const isCompleted = completionMap.get(dateStr) || false;

              return (
                <div
                  key={dateStr}
                  className="w-3 h-3 rounded-sm transition-all duration-200 hover:scale-125"
                  style={{
                    backgroundColor: color,
                    opacity: getOpacity(isCompleted),
                  }}
                  title={`${format(day, 'd MMMM', { locale: ru })}${isCompleted ? ' - выполнено' : ''}`}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default HabitHeatmap;
