"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-boot";

/**
 * Light / dark theme for the whole app. The choice lives on <html data-theme="..."> (set before the
 * first paint by the inline script in app/layout.tsx, so there's no flash) and in localStorage.
 * Without a saved choice the operating system's preference decides.
 */
export type Theme = "dark" | "light";

const listeners = new Set<() => void>();

/** The theme currently on <html> (dark during server rendering). */
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    window.localStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage blocked: the choice lasts for this page only */
  }
  listeners.forEach((l) => l());
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentTheme,
    () => "dark",
  );
}
