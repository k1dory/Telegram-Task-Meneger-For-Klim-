import { InputHTMLAttributes, forwardRef } from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/utils';

interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label?: string;
  description?: string;
}

const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, description, checked, onChange, ...props }, ref) => {
    return (
      <label className="flex items-start gap-3 cursor-pointer group">
        <div className="relative flex-shrink-0 mt-0.5">
          <input
            ref={ref}
            type="checkbox"
            checked={checked}
            onChange={onChange}
            className="sr-only peer"
            {...props}
          />
          <div
            className={cn(
              'w-5 h-5 rounded-md border-2 transition-all duration-200',
              'border-dark-600 bg-dark-900',
              'group-hover:border-primary-500/50',
              'peer-checked:border-primary-500 peer-checked:bg-primary-500',
              'peer-focus:ring-2 peer-focus:ring-primary-500/50',
              className
            )}
          >
            <motion.svg
              initial={false}
              animate={checked ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0 }}
              className="w-full h-full text-white p-0.5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </motion.svg>
          </div>
        </div>
        {(label || description) && (
          <div className="flex flex-col">
            {label && (
              <span className="text-sm text-dark-100 group-hover:text-dark-50 transition-colors">
                {label}
              </span>
            )}
            {description && (
              <span className="text-xs text-dark-400">{description}</span>
            )}
          </div>
        )}
      </label>
    );
  }
);

Checkbox.displayName = 'Checkbox';

export default Checkbox;
