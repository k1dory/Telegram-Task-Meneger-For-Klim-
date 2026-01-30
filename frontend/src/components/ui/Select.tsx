import { useState, useRef, useEffect, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { useClickOutside } from '@/hooks';

interface Option {
  value: string;
  label: string;
  icon?: ReactNode;
  color?: string;
}

interface SelectProps {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  placeholder?: string;
  error?: string;
  disabled?: boolean;
  fullWidth?: boolean;
}

const Select = ({
  label,
  value,
  onChange,
  options,
  placeholder = 'Select...',
  error,
  disabled = false,
  fullWidth = true,
}: SelectProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [openUpward, setOpenUpward] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const containerRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false), isOpen);

  const selectedOption = options.find((opt) => opt.value === value);

  // Determine if dropdown should open upward based on available space
  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const dropdownHeight = Math.min(options.length * 44 + 8, 248); // ~44px per option + padding, max 248px
      setOpenUpward(spaceBelow < dropdownHeight && rect.top > dropdownHeight);
    }
  }, [isOpen, options.length]);

  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      {label && (
        <label className="text-sm font-medium text-dark-200">{label}</label>
      )}
      <div ref={containerRef} className="relative">
        <button
          ref={buttonRef}
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={cn(
            'w-full flex items-center justify-between gap-2',
            'bg-dark-800/70 border border-dark-600/60 rounded-xl',
            'px-4 py-3 text-left',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
            'transition-all duration-200',
            disabled && 'opacity-50 cursor-not-allowed',
            error && 'border-red-500',
            isOpen && 'ring-2 ring-primary-500/50 border-primary-500'
          )}
        >
          <span className={cn(selectedOption ? 'text-dark-50' : 'text-dark-500')}>
            {selectedOption ? (
              <span className="flex items-center gap-2">
                {selectedOption.icon}
                {selectedOption.color && (
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: selectedOption.color }}
                  />
                )}
                {selectedOption.label}
              </span>
            ) : (
              placeholder
            )}
          </span>
          <svg
            className={cn(
              'w-5 h-5 text-dark-400 transition-transform duration-200',
              isOpen && 'rotate-180'
            )}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: openUpward ? 10 : -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: openUpward ? 10 : -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50 w-full',
                openUpward ? 'bottom-full mb-2' : 'top-full mt-2',
                'bg-dark-800/95 border border-dark-700/60 rounded-xl',
                'shadow-xl shadow-black/20 overflow-hidden backdrop-blur-sm'
              )}
            >
              <div className="max-h-60 overflow-y-auto py-1">
                {options.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      onChange(option.value);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-4 py-2.5 text-left',
                      'transition-colors duration-150',
                      option.value === value
                        ? 'bg-primary-500/20 text-primary-400'
                        : 'text-dark-200 hover:bg-dark-700'
                    )}
                  >
                    {option.icon}
                    {option.color && (
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: option.color }}
                      />
                    )}
                    <span>{option.label}</span>
                    {option.value === value && (
                      <svg
                        className="w-4 h-4 ml-auto text-primary-500"
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path
                          fillRule="evenodd"
                          d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                          clipRule="evenodd"
                        />
                      </svg>
                    )}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};

export default Select;
