import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout';
import { Home, Folders, FolderDetail, Settings, Calendar } from '@/pages';
import { useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { apiClient } from '@/api';

function App() {
  const { setUser, setTelegramUser, setIsLoading, setError } = useAppStore();
  const { isReady, user: telegramUser, initData } = useTelegram();
  const [authAttempted, setAuthAttempted] = useState(false);

  useEffect(() => {
    const authenticate = async () => {
      if (!isReady || authAttempted) return;

      setAuthAttempted(true);

      if (telegramUser && initData) {
        // Set Telegram user data
        setTelegramUser(telegramUser);

        try {
          // Authenticate with backend and get JWT
          const authResponse = await apiClient.authenticate(initData);
          setUser(authResponse.user);
        } catch (error) {
          console.error('Authentication failed:', error);
          setError('Не удалось подключиться к серверу. Попробуйте позже.');
          // Don't set fake user - this would cause API calls to fail with 401
        }

        setIsLoading(false);
      } else if (!telegramUser) {
        // Development mode - try to use stored token or show dev message
        if (apiClient.isAuthenticated()) {
          try {
            const user = await apiClient.getCurrentUser();
            setUser(user);
          } catch {
            // Token expired, create dev user
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
          }
        } else {
          // No token, create dev user for local development
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
        }
        setIsLoading(false);
      }
    };

    authenticate();
  }, [isReady, telegramUser, initData, authAttempted, setUser, setTelegramUser, setIsLoading, setError]);

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
