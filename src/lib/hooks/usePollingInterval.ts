"use client";

import { useEffect, useRef } from "react";

/**
 * Visibility-aware polling. Calls `callback` on mount, then every `intervalMs` while the
 * tab is visible. When the tab becomes hidden, the timer pauses (no network activity, no
 * re-renders). When the tab becomes visible again, it fires `callback` immediately and
 * resumes the schedule.
 *
 * This matters for two reasons after the i18n migration:
 *   1. We have ~30s polling on /dashboard and /stores/[id]. Without pausing, hidden tabs
 *      keep firing fetches every 30s — wasted CPU, network, battery.
 *   2. Each poll triggers a re-render of consumers. With more components subscribed to
 *      i18n context, that re-render is more expensive than before.
 *
 * Default 60s — we doubled it from 30s. The "real-time feel" was overspec'd; project
 * timelines move on hours-to-days, not seconds.
 *
 * Usage:
 *   usePollingInterval(() => fetchStore(), 60_000);
 *
 * `callback` is held in a ref so the hook doesn't tear down/restart the interval each
 * render when the caller passes an inline arrow function.
 */
export function usePollingInterval(callback: () => void, intervalMs: number = 60_000) {
  const cbRef = useRef(callback);
  // Keep latest callback without restarting the interval.
  useEffect(() => { cbRef.current = callback; }, [callback]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const start = () => {
      if (timer) return; // already running
      timer = setInterval(() => cbRef.current(), intervalMs);
    };

    const stop = () => {
      if (timer) { clearInterval(timer); timer = null; }
    };

    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        // Coming back from hidden — fire once immediately to catch up, then resume schedule.
        cbRef.current();
        start();
      }
    };

    // Initial start (assume page mounted while visible).
    if (!document.hidden) start();

    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      stop();
    };
  }, [intervalMs]);
}
