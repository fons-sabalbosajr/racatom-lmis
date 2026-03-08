// src/utils/useIdleTimeout.js
// Custom hook: monitors user activity (mouse, keyboard, touch, scroll)
// and auto-logs out after a configurable idle period (default 10 minutes).
import { useEffect, useRef, useCallback } from "react";

/**
 * @param {Object}   opts
 * @param {number}   opts.timeout        Idle timeout in milliseconds (default: 600_000 = 10 min)
 * @param {number}   opts.warningBefore  Show warning this many ms before logout (default: 60_000 = 1 min)
 * @param {Function} opts.onIdle         Called when user is idle past the timeout
 * @param {Function} opts.onWarning      Called when warning period starts (optional)
 * @param {Function} opts.onActive       Called when user becomes active after warning (optional)
 * @param {boolean}  opts.disabled       Set true to disable the hook (e.g. on login page)
 */
export default function useIdleTimeout({
  timeout = 10 * 60 * 1000, // 10 minutes
  warningBefore = 60 * 1000, // 1 minute warning
  onIdle,
  onWarning,
  onActive,
  disabled = false,
} = {}) {
  const timerRef = useRef(null);
  const warningTimerRef = useRef(null);
  const isWarningRef = useRef(false);

  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    if (warningTimerRef.current) {
      clearTimeout(warningTimerRef.current);
      warningTimerRef.current = null;
    }
  }, []);

  const resetTimers = useCallback(() => {
    if (disabled) return;
    clearTimers();

    // If we were in warning state, notify that user became active
    if (isWarningRef.current) {
      isWarningRef.current = false;
      if (onActive) onActive();
    }

    const warningDelay = Math.max(timeout - warningBefore, 0);

    // Set warning timer (fires 1 min before logout)
    if (warningBefore > 0 && onWarning && warningDelay > 0) {
      warningTimerRef.current = setTimeout(() => {
        isWarningRef.current = true;
        onWarning();
      }, warningDelay);
    }

    // Set idle timer (fires at timeout)
    timerRef.current = setTimeout(() => {
      if (onIdle) onIdle();
    }, timeout);
  }, [timeout, warningBefore, onIdle, onWarning, onActive, disabled, clearTimers]);

  useEffect(() => {
    if (disabled) return;

    // Events that indicate user activity
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "keyup",
      "touchstart",
      "touchmove",
      "scroll",
      "wheel",
      "click",
      "contextmenu",
    ];

    // Throttle resets to avoid excessive timer resets on rapid events
    let lastReset = 0;
    const THROTTLE_MS = 1000; // only reset once per second

    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset < THROTTLE_MS) return;
      lastReset = now;
      resetTimers();
    };

    // Attach listeners
    events.forEach((ev) => {
      document.addEventListener(ev, handleActivity, { passive: true });
    });

    // Also listen for visibility changes (tab switch back = activity)
    const handleVisibility = () => {
      if (!document.hidden) {
        handleActivity();
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Start the initial timer
    resetTimers();

    return () => {
      clearTimers();
      events.forEach((ev) => {
        document.removeEventListener(ev, handleActivity);
      });
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [disabled, resetTimers, clearTimers]);

  return { resetTimers };
}
