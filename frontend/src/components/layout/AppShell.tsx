import { ReactNode, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { GlobalModals } from '@/components/modals';
import { useAppStore } from '@/store';
import { cn } from '@/utils';

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const { isSidebarOpen, setSidebarOpen, theme, isLoading, isAuthenticated } = useAppStore();

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  useEffect(() => {
    const root = document.documentElement;
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const resolveTheme = () => {
      if (theme === 'dark' || theme === 'light') return theme;
      const telegramScheme = window.Telegram?.WebApp?.colorScheme;
      if (telegramScheme === 'dark' || telegramScheme === 'light') {
        return telegramScheme;
      }
      return mediaQuery.matches ? 'dark' : 'light';
    };

    const applyTheme = () => {
      const resolved = resolveTheme();
      root.setAttribute('data-theme', resolved);
      const tg = window.Telegram?.WebApp;
      if (tg) {
        const bg = resolved === 'dark' ? '#0f172a' : '#f8fafc';
        tg.setHeaderColor(bg);
        tg.setBackgroundColor(bg);
      }
    };

    applyTheme();

    if (theme === 'auto') {
      mediaQuery.addEventListener('change', applyTheme);
      return () => mediaQuery.removeEventListener('change', applyTheme);
    }
    return undefined;
  }, [theme]);

  const hideBottomNav = location.pathname.includes('/task/') || location.pathname.includes('/note/');

  // Show loading screen while authenticating
  if (isLoading) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-dark-400">Загрузка...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0 opacity-60"
        style={{
          backgroundImage:
            'radial-gradient(1200px 600px at 10% -10%, rgba(139, 92, 246, 0.22), transparent 60%), radial-gradient(900px 500px at 90% 0%, rgba(56, 189, 248, 0.18), transparent 55%)',
        }}
      />

      <div className="relative z-10">
        {/* Sidebar for desktop */}
        <Sidebar />

        {/* Overlay for mobile sidebar */}
        <AnimatePresence>
          {isSidebarOpen && (
            <div
              className="fixed inset-0 z-40 bg-black/50 lg:hidden"
              onClick={() => setSidebarOpen(false)}
            />
          )}
        </AnimatePresence>

        {/* Main content */}
        <main
          className={cn(
            'min-h-screen transition-all duration-300',
            'lg:pl-64', // Sidebar width on desktop
            !hideBottomNav && 'pb-20 lg:pb-0' // Bottom nav padding on mobile
          )}
        >
          <div className="max-w-4xl mx-auto px-4 py-4 lg:py-6">
            {children}
          </div>
        </main>

        {/* Bottom navigation for mobile */}
        {!hideBottomNav && <BottomNav />}

        {/* Global Modals */}
        <GlobalModals />
      </div>
    </div>
  );
};

export default AppShell;
