import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/utils';
import { useClickOutside } from '@/hooks';

interface ColorPickerProps {
  label?: string;
  value: string;
  onChange: (color: string) => void;
  colors?: string[];
}

const defaultColors = [
  '#ef4444', // red
  '#f97316', // orange
  '#f59e0b', // amber
  '#eab308', // yellow
  '#84cc16', // lime
  '#22c55e', // green
  '#10b981', // emerald
  '#14b8a6', // teal
  '#06b6d4', // cyan
  '#0ea5e9', // sky
  '#3b82f6', // blue
  '#6366f1', // indigo
  '#8b5cf6', // violet
  '#a855f7', // purple
  '#d946ef', // fuchsia
  '#ec4899', // pink
  '#f43f5e', // rose
  '#94a3b8', // slate
];

const ColorPicker = ({
  label,
  value,
  onChange,
  colors = defaultColors,
}: ColorPickerProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useClickOutside<HTMLDivElement>(() => setIsOpen(false), isOpen);

  return (
    <div className="flex flex-col gap-1.5 w-full">
      {label && (
        <label className="text-sm font-medium text-dark-200">{label}</label>
      )}
      <div ref={containerRef} className="relative">
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-3',
            'bg-dark-900 border border-dark-700 rounded-xl',
            'px-4 py-3 text-left',
            'focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500',
            'transition-all duration-200',
            isOpen && 'ring-2 ring-primary-500/50 border-primary-500'
          )}
        >
          <div
            className="w-6 h-6 rounded-lg border border-dark-600"
            style={{ backgroundColor: value }}
          />
          <span className="text-dark-200 uppercase">{value}</span>
        </button>

        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              className={cn(
                'absolute z-50 w-full mt-2',
                'bg-dark-800 border border-dark-700 rounded-xl',
                'shadow-xl shadow-black/20 p-4'
              )}
            >
              <div className="grid grid-cols-6 gap-2">
                {colors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => {
                      onChange(color);
                      setIsOpen(false);
                    }}
                    className={cn(
                      'w-10 h-10 rounded-xl transition-all duration-200',
                      'hover:scale-110 focus:outline-none',
                      value === color && 'ring-2 ring-white ring-offset-2 ring-offset-dark-800'
                    )}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Custom color input */}
              <div className="mt-4 pt-4 border-t border-dark-700">
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className="w-10 h-10 rounded-lg border-0 cursor-pointer"
                  />
                  <input
                    type="text"
                    value={value}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                        onChange(val);
                      }
                    }}
                    className={cn(
                      'flex-1 bg-dark-900 border border-dark-700 rounded-lg',
                      'px-3 py-2 text-dark-50 uppercase',
                      'focus:outline-none focus:ring-2 focus:ring-primary-500/50'
                    )}
                    placeholder="#000000"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default ColorPicker;
