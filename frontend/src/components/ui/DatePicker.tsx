import { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  format,
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  isToday,
  addMonths,
  subMonths,
  startOfWeek,
  endOfWeek,
} from 'date-fns';
import { ru } from 'date-fns/locale';
import { cn } from '@/utils';

interface DatePickerProps {
  label?: string;
  value: Date | null;
  onChange: (date: Date | null) => void;
  placeholder?: string;
  error?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  clearable?: boolean;
}

const CALENDAR_WIDTH = 320;
const CALENDAR_HEIGHT = 380;

const DatePicker = ({
  label,
  value,
  onChange,
  placeholder = 'Выберите дату',
  error,
  minDate,
  maxDate,
  disabled = false,
  clearable = true,
}: DatePickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value || new Date());
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];

  const isDateDisabled = (date: Date) => {
    if (minDate && date < minDate) return true;
    if (maxDate && date > maxDate) return true;
    return false;
  };

  const handleSelect = (date: Date) => {
    if (!isDateDisabled(date)) {
      onChange(date);
      setIsOpen(false);
    }
  };

  // Calculate calendar position
  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;

    const rect = buttonRef.current.getBoundingClientRect();
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    // Calculate horizontal position - center below button or fit in viewport
    let left = rect.left + (rect.width / 2) - (CALENDAR_WIDTH / 2);
    // Keep within viewport
    left = Math.max(8, Math.min(left, viewportWidth - CALENDAR_WIDTH - 8));

    // Calculate vertical position
    const spaceBelow = viewportHeight - rect.bottom - 16;
    const spaceAbove = rect.top - 16;

    let top: number;
    if (spaceBelow >= CALENDAR_HEIGHT) {
      top = rect.bottom + 8;
    } else if (spaceAbove >= CALENDAR_HEIGHT) {
      top = rect.top - CALENDAR_HEIGHT - 8;
    } else {
      // Center in viewport if not enough space
      top = Math.max(8, (viewportHeight - CALENDAR_HEIGHT) / 2);
    }

    setPosition({ top, left });
  }, []);

  // Update position when opening
  useLayoutEffect(() => {
    if (isOpen) {
      updatePosition();
    }
  }, [isOpen, updatePosition]);

  // Update position on scroll/resize and month change
  useEffect(() => {
    if (!isOpen) return;

    updatePosition();

    const handleUpdate = () => updatePosition();
    window.addEventListener('scroll', handleUpdate, true);
    window.addEventListener('resize', handleUpdate);

    return () => {
      window.removeEventListener('scroll', handleUpdate, true);
      window.removeEventListener('resize', handleUpdate);
    };
  }, [isOpen, currentMonth, updatePosition]);

  // Close on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        calendarRef.current && !calendarRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Close on escape
  useEffect(() => {
    if (!isOpen) return;
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [isOpen]);

  const calendar = (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={calendarRef}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          transition={{ duration: 0.15 }}
          style={{
            position: 'fixed',
            top: position.top,
            left: position.left,
            width: CALENDAR_WIDTH,
            zIndex: 99999,
          }}
          className={cn(
            'bg-dark-800 border border-dark-700 rounded-xl',
            'shadow-2xl shadow-black/50 p-4'
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-dark-50 font-medium capitalize">
              {format(currentMonth, 'LLLL yyyy', { locale: ru })}
            </span>
            <button
              type="button"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              className="p-2 hover:bg-dark-700 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Week days */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-center text-xs font-medium text-dark-400 py-2"
              >
                {day}
              </div>
            ))}
          </div>

          {/* Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day) => {
              const isSelected = value && isSameDay(day, value);
              const isCurrentMonth = isSameMonth(day, currentMonth);
              const isDisabledDate = isDateDisabled(day);
              const isDayToday = isToday(day);

              return (
                <button
                  key={day.toISOString()}
                  type="button"
                  onClick={() => handleSelect(day)}
                  disabled={isDisabledDate}
                  className={cn(
                    'w-9 h-9 text-sm rounded-lg transition-colors flex items-center justify-center',
                    !isCurrentMonth && 'text-dark-600',
                    isCurrentMonth && !isSelected && 'text-dark-200 hover:bg-dark-700',
                    isSelected && 'bg-primary-500 text-white',
                    isDayToday && !isSelected && 'ring-1 ring-primary-500',
                    isDisabledDate && 'opacity-30 cursor-not-allowed'
                  )}
                >
                  {format(day, 'd')}
                </button>
              );
            })}
          </div>

          {/* Today button */}
          <button
            type="button"
            onClick={() => {
              setCurrentMonth(new Date());
              onChange(new Date());
              setIsOpen(false);
            }}
            className="w-full mt-3 py-2 text-sm text-primary-400 hover:bg-dark-700 rounded-lg transition-colors"
          >
            Сегодня
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-dark-200">{label}</label>
      )}
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2',
            'bg-dark-900 border border-dark-700 rounded-xl',
            'px-4 py-3 text-left',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
            'transition-all duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-500',
            isOpen && 'ring-2 ring-primary-500/50 border-primary-500'
          )}
        >
          <span className={cn(value ? 'text-dark-50' : 'text-dark-500')}>
            {value ? format(value, 'd MMMM yyyy', { locale: ru }) : placeholder}
          </span>
          <div className="flex items-center gap-2">
            {clearable && value && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(null);
                }}
                className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
              >
                <svg className="w-4 h-4 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        </button>

        {createPortal(calendar, document.body)}
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default DatePicker;
