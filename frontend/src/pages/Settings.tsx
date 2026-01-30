import { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { PageHeader } from '@/components/layout';
import { Card, Button, Select } from '@/components/ui';
import { useAppStore } from '@/store';
import { useTelegram } from '@/hooks';
import { authApi } from '@/api';
import { cn } from '@/utils';

const TIMEZONE_OPTIONS = [
  { value: 'UTC', label: 'UTC (GMT+0)' },
  { value: 'Europe/Moscow', label: 'Москва (GMT+3)' },
  { value: 'Europe/Kaliningrad', label: 'Калининград (GMT+2)' },
  { value: 'Europe/Samara', label: 'Самара (GMT+4)' },
  { value: 'Asia/Yekaterinburg', label: 'Екатеринбург (GMT+5)' },
  { value: 'Asia/Omsk', label: 'Омск (GMT+6)' },
  { value: 'Asia/Krasnoyarsk', label: 'Красноярск (GMT+7)' },
  { value: 'Asia/Irkutsk', label: 'Иркутск (GMT+8)' },
  { value: 'Asia/Yakutsk', label: 'Якутск (GMT+9)' },
  { value: 'Asia/Vladivostok', label: 'Владивосток (GMT+10)' },
  { value: 'Asia/Magadan', label: 'Магадан (GMT+11)' },
  { value: 'Asia/Kamchatka', label: 'Камчатка (GMT+12)' },
  { value: 'Europe/Kiev', label: 'Киев (GMT+2)' },
  { value: 'Europe/Minsk', label: 'Минск (GMT+3)' },
  { value: 'Asia/Almaty', label: 'Алматы (GMT+6)' },
  { value: 'Asia/Tashkent', label: 'Ташкент (GMT+5)' },
  { value: 'Asia/Baku', label: 'Баку (GMT+4)' },
  { value: 'Asia/Tbilisi', label: 'Тбилиси (GMT+4)' },
  { value: 'Europe/London', label: 'Лондон (GMT+0)' },
  { value: 'Europe/Berlin', label: 'Берлин (GMT+1)' },
  { value: 'America/New_York', label: 'Нью-Йорк (GMT-5)' },
  { value: 'America/Los_Angeles', label: 'Лос-Анджелес (GMT-8)' },
  { value: 'Asia/Tokyo', label: 'Токио (GMT+9)' },
  { value: 'Asia/Shanghai', label: 'Шанхай (GMT+8)' },
  { value: 'Asia/Dubai', label: 'Дубай (GMT+4)' },
];

const Settings = () => {
  const { user, theme, setTheme, logout, updateUserSettings } = useAppStore();
  const { platform, showConfirm, openLink } = useTelegram();
  const [notificationsEnabled, setNotificationsEnabled] = useState(
    user?.notification_enabled ?? true
  );
  const [reminderHours, setReminderHours] = useState<number[]>(
    user?.reminder_hours ?? [6, 8, 12]
  );
  const [timezone, setTimezone] = useState(user?.settings?.timezone || 'UTC');
  const [isSaving, setIsSaving] = useState(false);

  const reminderOptions = useMemo(
    () => [
      { value: 6, label: '06:00' },
      { value: 8, label: '08:00' },
      { value: 12, label: '12:00' },
      { value: 18, label: '18:00' },
      { value: 21, label: '21:00' },
    ],
    []
  );

  useEffect(() => {
    if (!user) return;
    setNotificationsEnabled(user.notification_enabled);
    setReminderHours(user.reminder_hours || []);
    setTimezone(user.settings?.timezone || 'UTC');
  }, [user]);

  const handleLogout = () => {
    showConfirm('Вы уверены, что хотите выйти?', (confirmed) => {
      if (confirmed) {
        logout();
      }
    });
  };

  const formatReminderHours = (hours: number[]) =>
    hours
      .slice()
      .sort((a, b) => a - b)
      .map((h) => `${String(h).padStart(2, '0')}:00`)
      .join(', ');

  const saveSettings = async (
    next: { notification_enabled: boolean; reminder_hours: number[]; timezone: string },
    rollback: () => void
  ) => {
    if (!user) return;
    setIsSaving(true);
    try {
      await authApi.updateSettings({
        notification_enabled: next.notification_enabled,
        reminder_hours: next.reminder_hours,
        language_code: user.language_code,
        timezone: next.timezone,
      });
      updateUserSettings(next);
    } catch (error) {
      console.error('Failed to save settings:', error);
      rollback(); // Rollback on error
    } finally {
      setIsSaving(false);
    }
  };

  const toggleNotifications = () => {
    const prev = notificationsEnabled;
    const next = !prev;
    setNotificationsEnabled(next);
    saveSettings(
      { notification_enabled: next, reminder_hours: reminderHours, timezone },
      () => setNotificationsEnabled(prev) // Rollback function
    );
  };

  const toggleReminderHour = (hour: number) => {
    const prev = [...reminderHours];
    const next = reminderHours.includes(hour)
      ? reminderHours.filter((h) => h !== hour)
      : [...reminderHours, hour];
    setReminderHours(next);
    saveSettings(
      { notification_enabled: notificationsEnabled, reminder_hours: next, timezone },
      () => setReminderHours(prev) // Rollback function
    );
  };

  const handleTimezoneChange = (newTimezone: string) => {
    const prev = timezone;
    setTimezone(newTimezone);
    saveSettings(
      { notification_enabled: notificationsEnabled, reminder_hours: reminderHours, timezone: newTimezone },
      () => setTimezone(prev) // Rollback function
    );
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
              {user.first_name?.charAt(0) || '?'}
            </div>
            <div>
              <h2 className="text-lg font-semibold text-dark-50">
                {user.first_name} {user.last_name}
              </h2>
              <p className="text-dark-400">@{user.username || 'user'}</p>
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
          description={notificationsEnabled ? 'Включены' : 'Выключены'}
          action={
            <button
              type="button"
              onClick={toggleNotifications}
              disabled={isSaving}
              className={cn(
                'w-11 h-6 rounded-full relative transition-colors flex-shrink-0',
                notificationsEnabled ? 'bg-primary-500' : 'bg-dark-600',
                isSaving && 'opacity-60 cursor-not-allowed'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 left-1 w-4 h-4 bg-white rounded-full shadow transition-transform',
                  notificationsEnabled ? 'translate-x-5' : 'translate-x-0'
                )}
              />
            </button>
          }
        />

        <SettingItem
          icon={
            <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          }
          label="Часовой пояс"
          description={TIMEZONE_OPTIONS.find(t => t.value === timezone)?.label || timezone}
          action={
            <Select
              value={timezone}
              onChange={handleTimezoneChange}
              options={TIMEZONE_OPTIONS}
              fullWidth={false}
            />
          }
        />

        <div className="px-4 pb-4">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-dark-700">
              <svg className="w-5 h-5 text-dark-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="font-medium text-dark-100">Время напоминаний</p>
              <p className="text-sm text-dark-400">
                {reminderHours.length > 0 ? formatReminderHours(reminderHours) : 'Не выбрано'}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {reminderOptions.map((option) => {
              const isActive = reminderHours.includes(option.value);
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleReminderHour(option.value)}
                  disabled={isSaving}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-colors border',
                    isActive
                      ? 'bg-primary-500/20 text-primary-400 border-primary-500/40'
                      : 'bg-dark-700 text-dark-300 border-dark-600 hover:bg-dark-600',
                    isSaving && 'opacity-60 cursor-not-allowed'
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
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
