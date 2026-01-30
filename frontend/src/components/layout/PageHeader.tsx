import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { cn } from '@/utils';
import { useAppStore } from '@/store';

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  showMenu?: boolean;
  action?: ReactNode;
  className?: string;
}

const PageHeader = ({
  title,
  subtitle,
  showBack = false,
  showMenu = true,
  action,
  className,
}: PageHeaderProps) => {
  const navigate = useNavigate();
  const { setSidebarOpen } = useAppStore();

  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('flex items-center justify-between mb-6', className)}
    >
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={() => navigate(-1)}
            className="p-2 -ml-2 rounded-xl hover:bg-dark-800 transition-colors"
          >
            <svg
              className="w-5 h-5 text-dark-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
          </button>
        )}

        {showMenu && !showBack && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 -ml-2 rounded-xl hover:bg-dark-800 transition-colors lg:hidden"
          >
            <svg
              className="w-5 h-5 text-dark-300"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 6h16M4 12h16M4 18h16"
              />
            </svg>
          </button>
        )}

        <div>
          <h1 className="text-xl font-bold text-dark-50">{title}</h1>
          {subtitle && <p className="text-sm text-dark-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>

      {action && <div className="flex items-center gap-2">{action}</div>}
    </motion.header>
  );
};

export default PageHeader;
