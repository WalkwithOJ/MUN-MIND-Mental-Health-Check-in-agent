"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * Idle detector. Fires `onIdle` after `timeoutMs` of no user activity and
 * auto-resets whenever the student interacts with the page (keyboard, mouse,
 * touch, or an explicit `ping()` call from application code).
 *
 * Used by the chat screen to show a "Still there?" modal after a long pause.
 * We deliberately do NOT persist any idle state — if the tab closes, there's
 * nothing to resume.
 */
interface UseIdleTimerOptions {
  timeoutMs: number;
  onIdle: () => void;
  /** Disable the timer entirely (e.g. while a modal is already open). */
  paused?: boolean;
}

const ACTIVITY_EVENTS: Array<keyof DocumentEventMap> = [
  "mousemove",
  "mousedown",
  "keydown",
  "touchstart",
  "scroll",
  "visibilitychange",
];

export function useIdleTimer({
  timeoutMs,
  onIdle,
  paused = false,
}: UseIdleTimerOptions) {
  const timerRef = useRef<number | null>(null);
  const onIdleRef = useRef(onIdle);

  // Keep the callback fresh without re-subscribing event listeners
  useEffect(() => {
    onIdleRef.current = onIdle;
  }, [onIdle]);

  // ping restarts the idle countdown. Exposed so app code can mark explicit
  // activity (e.g. a successful API reply) as a reset point.
  const ping = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    if (typeof window === "undefined") return;
    timerRef.current = window.setTimeout(() => {
      onIdleRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (paused) {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    // Arm the timer on mount / when un-paused
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => {
      onIdleRef.current();
    }, timeoutMs);

    function handleActivity() {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        onIdleRef.current();
      }, timeoutMs);
    }

    for (const evt of ACTIVITY_EVENTS) {
      document.addEventListener(evt, handleActivity, { passive: true });
    }
    return () => {
      for (const evt of ACTIVITY_EVENTS) {
        document.removeEventListener(evt, handleActivity);
      }
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [timeoutMs, paused]);

  return { ping };
}
