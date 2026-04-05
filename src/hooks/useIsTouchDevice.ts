"use client";

import { useSyncExternalStore } from "react";

/**
 * Returns true on devices whose primary input is touch (phones, most tablets).
 *
 * Detection is based on `matchMedia('(pointer: coarse)')` — the CSS4 media
 * query that asks "is the primary pointing device imprecise?". This is the
 * same approach used by Slack, Discord, and WhatsApp Web to decide whether
 * Enter should send a message or insert a newline, and it correctly handles
 * edge cases like:
 *   - iPad with a physical keyboard attached → reports fine pointer, so
 *     Enter-to-send stays enabled
 *   - Windows laptop with a touchscreen but trackpad as primary → reports
 *     fine pointer, stays desktop-style
 *   - Actual phones and most tablets → reports coarse, switches to
 *     button-only send
 *
 * SSR-safe: returns `false` on the server. The first client render hydrates
 * without a mismatch because we use useSyncExternalStore to separate the
 * server and client snapshots.
 */
const subscribe = (callback: () => void) => {
  if (typeof window === "undefined" || !window.matchMedia) return () => {};
  const mql = window.matchMedia("(pointer: coarse)");
  // Safari <14 only supports the deprecated addListener/removeListener API.
  if (mql.addEventListener) {
    mql.addEventListener("change", callback);
    return () => mql.removeEventListener("change", callback);
  }
  mql.addListener(callback);
  return () => mql.removeListener(callback);
};

const getClientSnapshot = (): boolean => {
  if (typeof window === "undefined" || !window.matchMedia) return false;
  return window.matchMedia("(pointer: coarse)").matches;
};

const getServerSnapshot = (): boolean => false;

export function useIsTouchDevice(): boolean {
  // useSyncExternalStore handles the SSR/hydration split correctly.
  // We deliberately do NOT use useEffect + useState because that would
  // render the desktop behavior on the first client paint before the
  // effect runs, causing a brief flash where Enter sends on mobile.
  const value = useSyncExternalStore(
    subscribe,
    getClientSnapshot,
    getServerSnapshot
  );
  return value;
}
