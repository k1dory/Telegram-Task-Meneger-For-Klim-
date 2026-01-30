import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AppShell } from '@/components/layout';
import { Home, Folders, FolderDetail, Settings } from '@/pages';
import { useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { apiClient } from '@/api';

function App() {
  const { setUser, setTelegramUser, setIsLoading } = useAppStore();
  const { isReady, user: telegramUser, initData } = useTelegram();

  useEffect(() => {
    if (isReady && telegramUser) {
      // Set Telegram user data
      setTelegramUser(telegramUser);

      // Set init data for API authentication
      if (initData) {
        apiClient.setInitData(initData);
      }

      // Create mock user for now (in production, this would come from backend)
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

      setIsLoading(false);
    } else if (isReady && !telegramUser) {
      // Development mode - create mock user
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
      setIsLoading(false);
    }
  }, [isReady, telegramUser, initData, setUser, setTelegramUser, setIsLoading]);

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
