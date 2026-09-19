"use client";

import { useSyncExternalStore } from "react";

/**
 * True when `query` matches. Returns `false` during SSR and the first client
 * render so server and client markup agree; the real value applies right
 * after hydration.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Tailwind's `sm` breakpoint and up. */
export function useIsSmUp(): boolean {
  return useMediaQuery("(min-width: 640px)");
}
