/**
 * Theme boot, usable from server components (no "use client" here, so layout.tsx gets the real string).
 * Runs in <head> before anything renders: saved choice, else the operating system's preference.
 */
export const THEME_KEY = "firebridge.theme";

export const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}document.documentElement.dataset.theme=t}catch(e){document.documentElement.dataset.theme="dark"}})();`;
