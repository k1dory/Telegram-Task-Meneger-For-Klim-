import { ReactNode, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import { useLocation } from 'react-router-dom';
import BottomNav from './BottomNav';
import Sidebar from './Sidebar';
import { useAppStore } from '@/store';
import { cn } from '@/utils';

interface AppShellProps {
  children: ReactNode;
}

const AppShell = ({ children }: AppShellProps) => {
  const location = useLocation();
  const { isSidebarOpen, setSidebarOpen } = useAppStore();

  // Close sidebar on route change on mobile
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname, setSidebarOpen]);

  const hideBottomNav = location.pathname.includes('/task/') || location.pathname.includes('/note/');

  return (
    <div className="min-h-screen bg-dark-900 text-dark-50">
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
    </div>
  );
};

export default AppShell;
