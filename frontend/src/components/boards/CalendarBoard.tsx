import { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  startOfWeek,
  endOfWeek,
  parseISO,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { useCalendarStore, useAppStore } from '@/store';
import { Card, Button } from '@/components/ui';
import { cn } from '@/utils';
import type { Item } from '@/types';

interface CalendarBoardProps {
  boardId: string;
}

const CalendarBoard = ({ boardId }: CalendarBoardProps) => {
  const { events, fetchEvents, currentMonth, setCurrentMonth, nextMonth, prevMonth, isLoading } =
    useCalendarStore();
  const { openModal } = useAppStore();
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    fetchEvents(boardId);
  }, [boardId, fetchEvents, currentMonth]);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const eventsByDate = useMemo(() => {
    const map = new Map<string, Item[]>();
    events.forEach((event) => {
      const startDate = event.metadata?.start_date || event.due_date;
      if (!startDate) return;
      const dateStr = format(parseISO(startDate), 'yyyy-MM-dd');
      const existing = map.get(dateStr) || [];
      map.set(dateStr, [...existing, event]);
    });
    return map;
  }, [events]);

  const selectedDateEvents = selectedDate
    ? eventsByDate.get(format(selectedDate, 'yyyy-MM-dd')) || []
    : [];

  const DayCell = ({ day }: { day: Date }) => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayEvents = eventsByDate.get(dateStr) || [];
    const isCurrentMonth = isSameMonth(day, currentMonth);
    const isSelected = selectedDate && isSameDay(day, selectedDate);
    const isDayToday = isToday(day);

    return (
      <motion.button
        whileTap={{ scale: 0.95 }}
        onClick={() => setSelectedDate(day)}
        className={cn(
          'relative p-2 rounded-xl transition-all duration-200 min-h-[60px] sm:min-h-[80px]',
          'flex flex-col items-start',
          !isCurrentMonth && 'opacity-30',
          isSelected && 'bg-primary-500/20 ring-2 ring-primary-500',
          !isSelected && isCurrentMonth && 'hover:bg-dark-700',
          isDayToday && !isSelected && 'ring-1 ring-primary-500/50'
        )}
      >
        <span
          className={cn(
            'text-sm font-medium',
            isSelected ? 'text-primary-400' : 'text-dark-200',
            isDayToday && 'text-primary-400'
          )}
        >
          {format(day, 'd')}
        </span>

        {/* Event indicators */}
        {dayEvents.length > 0 && (
          <div className="flex flex-wrap gap-0.5 mt-1">
            {dayEvents.slice(0, 3).map((event) => (
              <span
                key={event.id}
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: event.metadata?.color || '#6366f1' }}
              />
            ))}
            {dayEvents.length > 3 && (
              <span className="text-[10px] text-dark-400">+{dayEvents.length - 3}</span>
            )}
          </div>
        )}

        {/* Event preview on larger screens */}
        <div className="hidden sm:block w-full mt-1">
          {dayEvents.slice(0, 2).map((event) => {
            const color = event.metadata?.color || '#6366f1';
            return (
              <div
                key={event.id}
                className="text-[10px] truncate px-1 py-0.5 rounded mb-0.5"
                style={{ backgroundColor: `${color}20`, color }}
              >
                {event.title}
              </div>
            );
          })}
        </div>
      </motion.button>
    );
  };

  const EventCard = ({ event }: { event: Item }) => {
    const color = event.metadata?.color || '#6366f1';
    const startDate = event.metadata?.start_date || event.due_date;
    const endDate = event.metadata?.end_date || startDate;
    const allDay = event.metadata?.all_day;

    return (
      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        onClick={() => openModal('editEvent', event)}
        className="cursor-pointer"
      >
        <Card
          variant="bordered"
          padding="sm"
          className="hover:bg-dark-700/50 transition-colors"
          style={{ borderLeftColor: color, borderLeftWidth: 3 }}
        >
          <div className="flex items-start justify-between gap-2">
            <div>
              <h4 className="font-medium text-dark-100">{event.title}</h4>
              {event.content && (
                <p className="text-sm text-dark-400 mt-1 line-clamp-2">{event.content}</p>
              )}
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs text-dark-400 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  {allDay
                    ? 'Весь день'
                    : startDate && endDate
                    ? `${format(parseISO(startDate), 'HH:mm')} - ${format(parseISO(endDate), 'HH:mm')}`
                    : startDate
                    ? format(parseISO(startDate), 'HH:mm')
                    : ''}
                </span>
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
        <div className="h-[400px] bg-dark-800 rounded-2xl animate-pulse" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Calendar Header */}
      <Card variant="bordered" padding="sm">
        <div className="flex items-center justify-between">
          <button
            onClick={prevMonth}
            className="p-2 rounded-xl hover:bg-dark-700 transition-colors"
          >
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="text-center">
            <h2 className="text-lg font-semibold text-dark-50 capitalize">
              {format(currentMonth, 'LLLL yyyy', { locale: ru })}
            </h2>
          </div>

          <button
            onClick={nextMonth}
            className="p-2 rounded-xl hover:bg-dark-700 transition-colors"
          >
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </Card>

      {/* Calendar Grid */}
      <Card variant="bordered" padding="sm">
        {/* Week days header */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {weekDays.map((day) => (
            <div key={day} className="text-center text-xs font-medium text-dark-400 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {days.map((day) => (
            <DayCell key={day.toISOString()} day={day} />
          ))}
        </div>
      </Card>

      {/* Selected Date Events */}
      <AnimatePresence mode="wait">
        {selectedDate && (
          <motion.div
            key={selectedDate.toISOString()}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-dark-200">
                {format(selectedDate, 'd MMMM yyyy', { locale: ru })}
              </h3>
              <Button
                size="sm"
                onClick={() =>
                  openModal('createEvent', {
                    boardId,
                    startDate: selectedDate,
                  })
                }
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Добавить
              </Button>
            </div>

            {selectedDateEvents.length > 0 ? (
              <div className="space-y-2">
                {selectedDateEvents.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-dark-400">Нет событий на этот день</p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Today button */}
      {!isToday(currentMonth) && (
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={() => {
              setCurrentMonth(new Date());
              setSelectedDate(new Date());
            }}
          >
            Сегодня
          </Button>
        </div>
      )}
    </div>
  );
};

export default CalendarBoard;
