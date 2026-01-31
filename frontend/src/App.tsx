import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout';
import { Home, Folders, FolderDetail, Settings, Calendar } from '@/pages';
import { useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { apiClient } from '@/api';

function App() {
  const { setUser, setTelegramUser, setIsLoading, setError, error, isLoading } = useAppStore();
  const { isReady, user: telegramUser, initData } = useTelegram();
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    const authenticate = async () => {
      if (!isReady || authAttempted) return;

      setAuthAttempted(true);

      // Check if we're inside Telegram
      if (telegramUser && initData) {
        setTelegramUser(telegramUser);

        try {
          const authResponse = await apiClient.authenticate(initData);
          setUser(authResponse.user);
        } catch (err) {
          console.error('Authentication failed:', err);
          setError('Не удалось авторизоваться. Попробуйте перезапустить приложение.');
        }
        setIsLoading(false);
      } else {
        // Not inside Telegram
        if (import.meta.env.DEV) {
          // Development mode only - create dev user for local testing
          console.warn('[DEV MODE] Creating fake user for local development');
          setUser({
            id: 123456789,
            telegram_id: 123456789,
            username: 'developer',
            first_name: 'Developer',
            last_name: 'User',
            is_premium: false,
            language_code: 'ru',
            notification_enabled: true,
            reminder_hours: [6, 8, 12],
            settings: {
              notification_enabled: true,
              reminder_hours: [6, 8, 12],
              language_code: 'ru',
            },
            last_active_at: new Date().toISOString(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          setIsLoading(false);
        } else {
          // Production - show error, don't allow access outside Telegram
          setError('Откройте приложение через Telegram');
          setIsLoading(false);
        }
      }
    };

    authenticate();
  }, [isReady, telegramUser, initData, authAttempted, setUser, setTelegramUser, setIsLoading, setError]);

  // Show error screen if not in Telegram (production only)
  if (!isLoading && error && !telegramUser) {
    return (
      <div className="min-h-screen bg-dark-900 flex items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-dark-800 flex items-center justify-center">
            <svg className="w-10 h-10 text-primary-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          </div>
          <h1 className="text-xl font-bold text-dark-50 mb-3">
            Telegram Mini App
          </h1>
          <p className="text-dark-400 mb-6">
            {error}
          </p>
          <a
            href="https://t.me/NotionTaskManeger_bot"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-500 text-white rounded-xl hover:bg-primary-600 transition-colors font-medium"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
            </svg>
            Открыть в Telegram
          </a>
        </div>
      </div>
    );
  }

  // Show loading screen while authenticating - don't render pages yet
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
    <BrowserRouter>
      <AppShell>
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/folders" element={<Folders />} />
            <Route path="/folders/:id" element={<FolderDetail />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/calendar" element={<Calendar />} />
          </Routes>
        </AnimatePresence>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
