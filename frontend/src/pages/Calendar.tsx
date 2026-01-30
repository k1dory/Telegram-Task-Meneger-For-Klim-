import { useState, useMemo, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
  isToday,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { PageHeader } from '@/components/layout';
import { Card, Button, Badge } from '@/components/ui';
import { useCalendarStore, useFoldersStore, useAppStore } from '@/store';
import { boardsApi } from '@/api';
import { cn } from '@/utils';
import type { Item, Board } from '@/types';

const Calendar = () => {
  const { events, fetchEvents } = useCalendarStore();
  const { folders, fetchFolders } = useFoldersStore();
  const { openModal } = useAppStore();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [calendarBoards, setCalendarBoards] = useState<Board[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch folders and find calendar boards
  useEffect(() => {
    fetchFolders();
  }, [fetchFolders]);

  useEffect(() => {
    const loadCalendarBoards = async () => {
      if (folders.length === 0) {
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      try {
        const boardGroups = await Promise.all(
          folders.map((folder) => boardsApi.getByFolder(folder.id))
        );
        const boards = boardGroups.flat().filter((b) => b.type === 'calendar');
        setCalendarBoards(boards);

        // Fetch events from all calendar boards
        for (const board of boards) {
          await fetchEvents(board.id);
        }
      } catch (error) {
        console.error('Failed to load calendar boards:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadCalendarBoards();
  }, [folders, fetchEvents]);

  // Generate calendar days
  const calendarDays = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
    const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: calendarStart, end: calendarEnd });
  }, [currentMonth]);

  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter((event) => {
      const eventDate = event.metadata?.start_date || event.due_date;
      if (!eventDate) return false;
      return isSameDay(new Date(eventDate), day);
    });
  };

  // Get events for selected date
  const selectedDateEvents = selectedDate ? getEventsForDay(selectedDate) : [];

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
  const handleToday = () => {
    setCurrentMonth(new Date());
    setSelectedDate(new Date());
  };

  const handleCreateEvent = () => {
    if (calendarBoards.length > 0) {
      openModal('createEvent', {
        boardId: calendarBoards[0].id,
        startDate: selectedDate || new Date(),
      });
    }
  };

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-4"
    >
      <PageHeader
        title="Календарь"
        subtitle={format(currentMonth, 'LLLL yyyy', { locale: ru })}
      />

      {/* Calendar Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={handlePrevMonth}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Button>
          <Button variant="ghost" size="sm" onClick={handleToday}>
            Сегодня
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNextMonth}>
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Button>
        </div>
        {calendarBoards.length > 0 && (
          <Button size="sm" onClick={handleCreateEvent}>
            <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Событие
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="space-y-4">
          <div className="h-64 bg-dark-800 rounded-2xl animate-pulse" />
        </div>
      ) : calendarBoards.length === 0 ? (
        <Card variant="bordered" className="text-center py-12">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-dark-700 flex items-center justify-center">
            <svg className="w-8 h-8 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-dark-200 mb-2">Нет календарей</h3>
          <p className="text-dark-400 mb-4">
            Создайте папку с доской типа "Календарь" для отслеживания событий
          </p>
          <Button onClick={() => openModal('createFolder')}>
            Создать папку
          </Button>
        </Card>
      ) : (
        <>
          {/* Calendar Grid */}
          <Card variant="bordered" padding="sm">
            {/* Week days header */}
            <div className="grid grid-cols-7 mb-2">
              {weekDays.map((day) => (
                <div key={day} className="text-center text-xs font-medium text-dark-400 py-2">
                  {day}
                </div>
              ))}
            </div>

            {/* Days grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day) => {
                const dayEvents = getEventsForDay(day);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isSelected = selectedDate && isSameDay(day, selectedDate);
                const isTodayDate = isToday(day);

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => setSelectedDate(day)}
                    className={cn(
                      'aspect-square p-1 rounded-xl text-sm transition-all relative',
                      'flex flex-col items-center justify-start',
                      !isCurrentMonth && 'text-dark-600',
                      isCurrentMonth && 'text-dark-200',
                      isSelected && 'bg-primary-500/20 text-primary-400',
                      isTodayDate && !isSelected && 'bg-dark-700',
                      'hover:bg-dark-700'
                    )}
                  >
                    <span
                      className={cn(
                        'w-7 h-7 flex items-center justify-center rounded-full',
                        isTodayDate && 'bg-primary-500 text-white font-medium'
                      )}
                    >
                      {format(day, 'd')}
                    </span>
                    {dayEvents.length > 0 && (
                      <div className="flex gap-0.5 mt-0.5">
                        {dayEvents.slice(0, 3).map((event, i) => (
                          <span
                            key={i}
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: event.metadata?.color || '#6366f1' }}
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </Card>

          {/* Selected Day Events */}
          {selectedDate && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-dark-200">
                  {format(selectedDate, 'd MMMM, EEEE', { locale: ru })}
                </h3>
                <span className="text-sm text-dark-400">
                  {selectedDateEvents.length} событий
                </span>
              </div>

              {selectedDateEvents.length === 0 ? (
                <Card variant="bordered" padding="sm" className="text-center py-6">
                  <p className="text-dark-400 text-sm">Нет событий на этот день</p>
                  <Button variant="ghost" size="sm" className="mt-2" onClick={handleCreateEvent}>
                    Добавить событие
                  </Button>
                </Card>
              ) : (
                <div className="space-y-2">
                  {selectedDateEvents.map((event) => (
                    <Card
                      key={event.id}
                      variant="bordered"
                      padding="sm"
                      interactive
                      onClick={() => openModal('editEvent', event)}
                      style={{ borderLeftColor: event.metadata?.color || '#6366f1', borderLeftWidth: 3 }}
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-medium text-dark-100">{event.title}</h4>
                          {event.content && (
                            <p className="text-sm text-dark-400 mt-1 line-clamp-2">{event.content}</p>
                          )}
                        </div>
                        {event.metadata?.all_day && (
                          <Badge size="sm" variant="default">Весь день</Badge>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </motion.div>
  );
};

export default Calendar;
