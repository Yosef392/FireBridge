/**
 * Theme boot, usable from server components (no "use client" here, so layout.tsx gets the real string).
 *
 * The app opens in the operating system's mode (light or dark). The switch in the header overrides it
 * for the current visit only (sessionStorage), so the next time the app is opened it follows the system
 * again. Runs in <head> before anything renders, so the page never flashes the wrong theme.
 */
export const THEME_KEY = "firebridge.theme";

export const THEME_BOOT_SCRIPT = `(function(){var d=document.documentElement;try{localStorage.removeItem("${THEME_KEY}");var t=sessionStorage.getItem("${THEME_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}d.dataset.theme=t}catch(e){d.dataset.theme=window.matchMedia&&window.matchMedia("(prefers-color-scheme: light)").matches?"light":"dark"}})();`;
