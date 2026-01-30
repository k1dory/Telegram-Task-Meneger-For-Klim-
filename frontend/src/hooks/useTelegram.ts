import { useEffect, useState, useCallback } from 'react';

interface TelegramWebApp {
  ready: () => void;
  expand: () => void;
  close: () => void;
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    setText: (text: string) => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  colorScheme: 'light' | 'dark';
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: {
      id: number;
      is_bot?: boolean;
      first_name: string;
      last_name?: string;
      username?: string;
      language_code?: string;
      is_premium?: boolean;
      photo_url?: string;
    };
    auth_date?: number;
    hash?: string;
  };
  platform: string;
  version: string;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  switchInlineQuery: (query: string, choose_chat_types?: string[]) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

export function useTelegram() {
  const [isReady, setIsReady] = useState(false);
  const [webApp, setWebApp] = useState<TelegramWebApp | null>(null);

  useEffect(() => {
    const tg = window.Telegram?.WebApp;
    if (tg) {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0f172a');
      tg.setBackgroundColor('#0f172a');
      setWebApp(tg);
      setIsReady(true);
    }
  }, []);

  const user = webApp?.initDataUnsafe?.user || null;
  const initData = webApp?.initData || '';
  const colorScheme = webApp?.colorScheme || 'dark';
  const platform = webApp?.platform || 'unknown';

  const showMainButton = useCallback(
    (text: string, onClick: () => void) => {
      if (!webApp) return;
      webApp.MainButton.setText(text);
      webApp.MainButton.onClick(onClick);
      webApp.MainButton.show();
    },
    [webApp]
  );

  const hideMainButton = useCallback(() => {
    if (!webApp) return;
    webApp.MainButton.hide();
  }, [webApp]);

  const showBackButton = useCallback(
    (onClick: () => void) => {
      if (!webApp) return;
      webApp.BackButton.onClick(onClick);
      webApp.BackButton.show();
    },
    [webApp]
  );

  const hideBackButton = useCallback(() => {
    if (!webApp) return;
    webApp.BackButton.hide();
  }, [webApp]);

  const hapticFeedback = useCallback(
    (type: 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'warning' | 'selection') => {
      if (!webApp?.HapticFeedback) return;

      switch (type) {
        case 'light':
        case 'medium':
        case 'heavy':
          webApp.HapticFeedback.impactOccurred(type);
          break;
        case 'success':
        case 'error':
        case 'warning':
          webApp.HapticFeedback.notificationOccurred(type);
          break;
        case 'selection':
          webApp.HapticFeedback.selectionChanged();
          break;
      }
    },
    [webApp]
  );

  const showPopup = useCallback(
    (params: Parameters<TelegramWebApp['showPopup']>[0], callback?: (buttonId: string) => void) => {
      if (!webApp) return;
      webApp.showPopup(params, callback);
    },
    [webApp]
  );

  const showAlert = useCallback(
    (message: string, callback?: () => void) => {
      if (!webApp) {
        alert(message);
        callback?.();
        return;
      }
      webApp.showAlert(message, callback);
    },
    [webApp]
  );

  const showConfirm = useCallback(
    (message: string, callback?: (confirmed: boolean) => void) => {
      if (!webApp) {
        const result = confirm(message);
        callback?.(result);
        return;
      }
      webApp.showConfirm(message, callback);
    },
    [webApp]
  );

  const openLink = useCallback(
    (url: string, tryInstantView = false) => {
      if (!webApp) {
        window.open(url, '_blank');
        return;
      }
      webApp.openLink(url, { try_instant_view: tryInstantView });
    },
    [webApp]
  );

  const close = useCallback(() => {
    if (!webApp) return;
    webApp.close();
  }, [webApp]);

  return {
    isReady,
    webApp,
    user,
    initData,
    colorScheme,
    platform,
    showMainButton,
    hideMainButton,
    showBackButton,
    hideBackButton,
    hapticFeedback,
    showPopup,
    showAlert,
    showConfirm,
    openLink,
    close,
  };
}

export default useTelegram;
