import { useCallback, useEffect, useState } from 'react';

export const DEFAULT_EYE_CARE_INTERVAL_SECONDS = 1200; // 20 minutes

export function useEyeCareTimer(options: {
  enabled: boolean;
  resetKey: string;
  intervalSeconds?: number;
}) {
  const {
    enabled,
    resetKey,
    intervalSeconds = DEFAULT_EYE_CARE_INTERVAL_SECONDS,
  } = options;
  const [eyeCareOpen, setEyeCareOpen] = useState(false);

  useEffect(() => {
    if (!enabled || eyeCareOpen) return;
    let activeSeconds = 0;
    const interval = window.setInterval(() => {
      if (typeof document !== 'undefined' && document.hidden) return;
      activeSeconds += 1;
      if (activeSeconds >= intervalSeconds) {
        activeSeconds = 0;
        setEyeCareOpen(true);
      }
    }, 1000);
    return () => window.clearInterval(interval);
  }, [enabled, eyeCareOpen, intervalSeconds, resetKey]);

  const dismissEyeCare = useCallback(() => {
    setEyeCareOpen(false);
  }, []);

  return {
    eyeCareOpen,
    setEyeCareOpen,
    dismissEyeCare,
  };
}
