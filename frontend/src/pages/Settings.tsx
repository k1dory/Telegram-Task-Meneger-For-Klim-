import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout';
import { Card, Button, Select } from '@/components/ui';
import { useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { cn } from '@/utils';

const Settings = () => {
  const { user, theme, setTheme, logout } = useAppStore();
  const { platform, showConfirm, openLink } = useTelegram();

  const handleLogout = () => {
    showConfirm('Вы уверены, что хотите выйти?', (confirmed) => {
      if (confirmed) {
        logout();
      }
    });
  };

  const SettingItem = ({
    icon,
    label,
    description,
    action,
    onClick,
    danger = false,
  }: {
    icon: React.ReactNode;
    label: string;
    description?: string;
    action?: React.ReactNode;
    onClick?: () => void;
    danger?: boolean;
  }) => (
    <div
      className={cn(
        'flex items-center justify-between p-4 rounded-xl',
        onClick && 'cursor-pointer hover:bg-dark-700 transition-colors',
        danger && 'text-red-400'
      )}
      onClick={onClick}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'w-10 h-10 rounded-xl flex items-center justify-center',
            danger ? 'bg-red-500/20' : 'bg-dark-700'
          )}
        >
          {icon}
        </div>
        <div>
          <p className={cn('font-medium', danger ? 'text-red-400' : 'text-dark-100')}>
            {label}
          </p>
          {description && <p className="text-sm text-dark-400">{description}</p>}
        </div>
      </div>
      {action && <div>{action}</div>}
      {onClick && !action && (
        <svg className="w-5 h-5 text-dark-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  );

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <PageHeader title="Настройки" />

      {/* User Profile */}
      {user && (
        <Card variant="bordered">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-2xl font-bold text-white">
              {user.firstName.charAt(0)}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-50">
                {user.firstName} {user.lastName}
              </h2>
              <p className="text-dark-400">@{user.username || 'user'}</p>
              {user.isPremium && (
                <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded-full">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                  Premium
                </span>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* Appearance */}
      <Card variant="bordered" padding="none">
        <div className="p-4 border-b border-dark-700">
          <h3 className="font-semibold text-dark-100">Внешний вид</h3>
        </div>

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          }
          label="Тема"
          description={theme === 'dark' ? 'Темная' : theme === 'light' ? 'Светлая' : 'Системная'}
          action={
            <Select
              value={theme}
              onChange={(value) => setTheme(value as 'dark' | 'light' | 'auto')}
              options={[
                { value: 'dark', label: 'Темная' },
                { value: 'light', label: 'Светлая' },
                { value: 'auto', label: 'Системная' },
              ]}
              fullWidth={false}
            />
          }
        />
      </Card>

      {/* Notifications */}
      <Card variant="bordered" padding="none">
        <div className="p-4 border-b border-dark-700">
          <h3 className="font-semibold text-dark-100">Уведомления</h3>
        </div>

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          }
          label="Push-уведомления"
          description="Напоминания о задачах"
          action={
            <div className="w-12 h-6 bg-primary-500 rounded-full relative cursor-pointer">
              <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full shadow" />
            </div>
          }
        />

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Время напоминаний"
          description="За 30 минут до срока"
          onClick={() => {}}
        />
      </Card>

      {/* Data */}
      <Card variant="bordered" padding="none">
        <div className="p-4 border-b border-dark-700">
          <h3 className="font-semibold text-dark-100">Данные</h3>
        </div>

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
            </svg>
          }
          label="Экспорт данных"
          description="Скачать все задачи и заметки"
          onClick={() => {}}
        />

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          }
          label="Импорт данных"
          description="Загрузить из файла"
          onClick={() => {}}
        />
      </Card>

      {/* About */}
      <Card variant="bordered" padding="none">
        <div className="p-4 border-b border-dark-700">
          <h3 className="font-semibold text-dark-100">О приложении</h3>
        </div>

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Версия"
          description="1.0.0"
        />

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          }
          label="Политика конфиденциальности"
          onClick={() => openLink('https://example.com/privacy')}
        />

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192l-3.536 3.536M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-5 0a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          }
          label="Поддержка"
          onClick={() => openLink('https://t.me/support')}
        />
      </Card>

      {/* Danger Zone */}
      <Card variant="bordered" padding="none">
        <SettingItem
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
          label="Выйти"
          description="Выйти из аккаунта"
          onClick={handleLogout}
          danger
        />
      </Card>

      {/* Platform info */}
      <p className="text-center text-xs text-dark-500">
        Платформа: {platform} | Telegram Mini App
      </p>
    </motion.div>
  );
};

export default Settings;
