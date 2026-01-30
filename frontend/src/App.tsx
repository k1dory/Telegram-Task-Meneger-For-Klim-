import { useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout';
import { Home, Folders, FolderDetail, Settings } from '@/pages';
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
          // Fallback: use Telegram data directly if backend is unavailable
          setUser({
            id: telegramUser.id.toString(),
            telegramId: telegramUser.id,
            username: telegramUser.username,
            firstName: telegramUser.first_name,
            lastName: telegramUser.last_name,
            photoUrl: telegramUser.photo_url,
            isPremium: telegramUser.is_premium || false,
            createdAt: new Date().toISOString(),
            settings: {
              theme: 'dark',
              notifications: true,
              language: telegramUser.language_code || 'ru',
              defaultView: 'list',
            },
          });
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
              id: 'dev-user',
              telegramId: 123456789,
              username: 'developer',
              firstName: 'Developer',
              lastName: 'User',
              isPremium: false,
              createdAt: new Date().toISOString(),
              settings: {
                theme: 'dark',
                notifications: true,
                language: 'ru',
                defaultView: 'list',
              },
            });
          }
        } else {
          // No token, create dev user for local development
          setUser({
            id: 'dev-user',
            telegramId: 123456789,
            username: 'developer',
            firstName: 'Developer',
            lastName: 'User',
            isPremium: false,
            createdAt: new Date().toISOString(),
            settings: {
              theme: 'dark',
              notifications: true,
              language: 'ru',
              defaultView: 'list',
            },
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
            {/* Calendar route - uses the same page but different context */}
            <Route path="/calendar" element={<Folders />} />
          </Routes>
        </AnimatePresence>
      </AppShell>
    </BrowserRouter>
  );
}

export default App;
