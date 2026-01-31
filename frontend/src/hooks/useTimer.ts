import { useState, useEffect, useCallback, useRef } from 'react';

interface UseTimerOptions {
  initialTime?: number;
  autoStart?: boolean;
  onTick?: (time: number) => void;
  onComplete?: () => void;
  countdown?: boolean;
}

interface UseTimerReturn {
  time: number;
  isRunning: boolean;
  start: () => void;
  pause: () => void;
  reset: (newTime?: number) => void;
  toggle: () => void;
  formattedTime: string;
}

export function useTimer(options: UseTimerOptions = {}): UseTimerReturn {
  const {
    initialTime = 0,
    autoStart = false,
    onTick,
    onComplete,
    countdown = false,
  } = options;

  const [time, setTime] = useState(initialTime);
  const [isRunning, setIsRunning] = useState(autoStart);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const accumulatedTimeRef = useRef<number>(initialTime);

  // Use refs for callbacks to avoid recreating interval on callback changes
  const onTickRef = useRef(onTick);
  const onCompleteRef = useRef(onComplete);

  // Keep refs updated
  useEffect(() => {
    onTickRef.current = onTick;
  }, [onTick]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  const clearTimer = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  const start = useCallback(() => {
    if (isRunning) return;

    startTimeRef.current = Date.now();
    setIsRunning(true);
  }, [isRunning]);

  const pause = useCallback(() => {
    if (!isRunning) return;

    clearTimer();
    accumulatedTimeRef.current = time;
    setIsRunning(false);
  }, [isRunning, time, clearTimer]);

  const reset = useCallback((newTime?: number) => {
    clearTimer();
    const resetTime = newTime ?? initialTime;
    setTime(resetTime);
    accumulatedTimeRef.current = resetTime;
    setIsRunning(false);
  }, [clearTimer, initialTime]);

  const toggle = useCallback(() => {
    if (isRunning) {
      pause();
    } else {
      start();
    }
  }, [isRunning, pause, start]);

  useEffect(() => {
    if (!isRunning) return;

    intervalRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
      const newTime = countdown
        ? Math.max(0, accumulatedTimeRef.current - elapsed)
        : accumulatedTimeRef.current + elapsed;

      setTime(newTime);
      onTickRef.current?.(newTime);

      if (countdown && newTime === 0) {
        clearTimer();
        setIsRunning(false);
        onCompleteRef.current?.();
      }
    }, 1000);

    return clearTimer;
  }, [isRunning, countdown, clearTimer]);

  const formattedTime = formatTime(time);

  return {
    time,
    isRunning,
    start,
    pause,
    reset,
    toggle,
    formattedTime,
  };
}

function formatTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, '0')}:${minutes
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default useTimer;
