import { useEffect, useRef, RefObject } from 'react';

type Handler = (event: MouseEvent | TouchEvent) => void;

export function useClickOutside<T extends HTMLElement = HTMLElement>(
  handler: Handler,
  enabled: boolean = true
): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      const el = ref.current;
      const target = event.target as HTMLElement;

      if (!el || el.contains(target)) {
        return;
      }

      // Ignore clicks on portal elements (dropdowns, calendars, etc.)
      // They have z-index >= 99999 or data-portal attribute
      if (target.closest('[data-portal]')) {
        return;
      }

      // Check if clicked element or its parent has very high z-index (portaled elements)
      const clickedEl = target.closest('[style*="z-index: 99999"]') ||
                        target.closest('[style*="z-index:99999"]');
      if (clickedEl) {
        return;
      }

      handler(event);
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [handler, enabled]);

  return ref;
}

export default useClickOutside;
