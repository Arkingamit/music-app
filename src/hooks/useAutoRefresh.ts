import { useEffect, useRef, useCallback } from 'react';

interface UseAutoRefreshOptions {
  /** The refresh function to call */
  refreshFn: () => Promise<void>;
  /** Polling interval in milliseconds (default: 60000 = 60s) */
  intervalMs?: number;
  /** Whether to refresh when the tab regains focus (default: true) */
  refetchOnFocus?: boolean;
  /** Whether auto-refresh is enabled (default: true) */
  enabled?: boolean;
  /** Minimum time between refreshes in ms to avoid hammering (default: 5000) */
  throttleMs?: number;
}

/**
 * Hook that provides:
 * 1. Background polling at a configurable interval
 * 2. Automatic refresh when the browser tab regains focus
 * 3. Throttling to prevent excessive API calls
 * 
 * Usage:
 *   useAutoRefresh({ refreshFn: refreshSongs, intervalMs: 60000 });
 */
export function useAutoRefresh({
  refreshFn,
  intervalMs = 60000,
  refetchOnFocus = true,
  enabled = true,
  throttleMs = 5000,
}: UseAutoRefreshOptions) {
  const lastRefreshRef = useRef<number>(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Throttled refresh: prevents calling the API more often than throttleMs
  const throttledRefresh = useCallback(async () => {
    const now = Date.now();
    if (now - lastRefreshRef.current < throttleMs) {
      return; // Skip — too soon since last refresh
    }
    lastRefreshRef.current = now;
    try {
      await refreshFn();
    } catch (error) {
      // Silently catch — contexts handle their own error toasts
      console.debug('[useAutoRefresh] Background refresh failed:', error);
    }
  }, [refreshFn, throttleMs]);

  // Background polling
  useEffect(() => {
    if (!enabled) return;

    intervalRef.current = setInterval(throttledRefresh, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [enabled, intervalMs, throttledRefresh]);

  // Tab focus revalidation
  useEffect(() => {
    if (!enabled || !refetchOnFocus) return;

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        throttledRefresh();
      }
    };

    // Also handle window focus (covers alt-tab scenarios)
    const handleFocus = () => {
      throttledRefresh();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [enabled, refetchOnFocus, throttledRefresh]);
}
