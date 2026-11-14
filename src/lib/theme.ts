"use client";

import { useSyncExternalStore } from "react";
import { THEME_KEY } from "./theme-boot";

/**
 * Light / dark theme for the whole app, on <html data-theme="...">.
 * - Opening the app: the operating system's mode (set before first paint by the script in layout.tsx).
 * - The header switch: overrides it for this visit only (sessionStorage); the next visit starts from the
 *   system mode again.
 * - While no switch was used in this visit, a change of the system mode (e.g. Windows going dark in the
 *   evening) is followed live.
 */
export type Theme = "dark" | "light";

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** The theme currently on <html> (dark during server rendering). */
export function currentTheme(): Theme {
  if (typeof document === "undefined") return "dark";
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

export const systemTheme = (): Theme =>
  typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark";

function chosenThisVisit(): boolean {
  try {
    return window.sessionStorage.getItem(THEME_KEY) != null;
  } catch {
    return false;
  }
}

/** Manual choice from the switch: kept for this visit only. */
export function setTheme(t: Theme) {
  document.documentElement.dataset.theme = t;
  try {
    window.sessionStorage.setItem(THEME_KEY, t);
  } catch {
    /* storage blocked: the choice lasts until the page is reloaded */
  }
  notify();
}

// Follow live changes of the system mode until the user picks a theme with the switch.
let watching = false;
function watchSystem() {
  if (watching || typeof window === "undefined") return;
  watching = true;
  window.matchMedia("(prefers-color-scheme: light)").addEventListener("change", (e) => {
    if (chosenThisVisit()) return;
    document.documentElement.dataset.theme = e.matches ? "light" : "dark";
    notify();
  });
}

export function useTheme(): Theme {
  return useSyncExternalStore(
    (cb) => {
      watchSystem();
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    currentTheme,
    () => "dark",
  );
}
