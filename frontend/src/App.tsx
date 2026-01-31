import { useEffect, useState, useCallback } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout';
import { Home, Folders, FolderDetail, Settings, Calendar } from '@/pages';
import { useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { apiClient } from '@/api';

function App() {
  const { setUser, setTelegramUser, setIsLoading, setError, error, isLoading, isAuthenticated } = useAppStore();
  const { isReady, user: telegramUser, initData } = useTelegram();
  const [authAttempted, setAuthAttempted] = useState(false);
  const [authInProgress, setAuthInProgress] = useState(false);

  const authenticate = useCallback(async () => {
    // Prevent multiple auth attempts
    if (authAttempted || authInProgress) return;

    // Wait for Telegram WebApp to be ready
    if (!isReady) {
      console.log('[AUTH] Waiting for Telegram WebApp to be ready...');
      return; // Will be called again when isReady changes
    }

    setAuthInProgress(true);
    setAuthAttempted(true);
    console.log('[AUTH] Starting authentication, isReady:', isReady);

    // Check if we're inside Telegram with valid initData
    if (telegramUser && initData && initData.length > 0) {
      setTelegramUser(telegramUser);

      try {
        console.log('[AUTH] Authenticating with Telegram initData...');
        const authResponse = await apiClient.authenticate(initData);
        console.log('[AUTH] Authentication successful, user:', authResponse.user.username);
        setUser(authResponse.user);

        // Verify token was saved
        if (!apiClient.isAuthenticated()) {
          throw new Error('Token was not saved after authentication');
        }
      } catch (err) {
        console.error('[AUTH] Authentication failed:', err);
        setError('Не удалось авторизоваться. Попробуйте перезапустить приложение.');
      }
    } else {
      // Not inside Telegram or no valid initData
      console.warn('[AUTH] Not in Telegram or no initData', {
        hasUser: !!telegramUser,
        initDataLength: initData?.length || 0
      });

      // STRICT: No DEV mode fallback in production builds
      // Only allow dev user if explicitly running in development AND local
      if (import.meta.env.DEV && window.location.hostname === 'localhost') {
        console.warn('[DEV MODE] Creating fake user for LOCAL development only');
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
      } else {
        // Production or non-localhost - MUST open through Telegram
        setError('Откройте приложение через Telegram');
      }
    }

    setAuthInProgress(false);
    setIsLoading(false);
  }, [isReady, telegramUser, initData, authAttempted, authInProgress, setUser, setTelegramUser, setIsLoading, setError]);

  useEffect(() => {
    authenticate();
  }, [authenticate]);

  // Timeout for Telegram WebApp not loading
  useEffect(() => {
    if (isReady || authAttempted) return;

    const timeout = setTimeout(() => {
      if (!isReady && !authAttempted) {
        console.error('[AUTH] Telegram WebApp not ready after timeout');
        setError('Не удалось загрузить Telegram WebApp. Попробуйте перезапустить приложение.');
        setIsLoading(false);
      }
    }, 5000); // 5 seconds timeout

    return () => clearTimeout(timeout);
  }, [isReady, authAttempted, setError, setIsLoading]);

  // Show error screen if authentication failed
  if (!isLoading && error && !isAuthenticated) {
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
