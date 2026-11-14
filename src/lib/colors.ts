import type { RiskLevel, SatelliteSource } from "./types";
import { useTheme, type Theme } from "./theme";

/**
 * Chart & map colour roles. Categorical slots follow a validated dark-mode order
 * (blue, orange, aqua, yellow, magenta); risk uses a fixed ordinal fire ramp and
 * always ships with a text label so colour never carries meaning alone.
 */
export const SOURCE_COLORS: Record<SatelliteSource, string> = {
  MODIS: "#3987e5",
  VIIRS: "#d95926",
};

export const SERIES = ["#3987e5", "#d95926", "#199e70", "#c98500", "#d55181", "#9085e9", "#008300", "#e66767"];

export const RISK_COLORS: Record<RiskLevel, string> = {
  Low: "#2fa98c",
  Moderate: "#e9b949",
  High: "#ee6a2c",
  Extreme: "#d23a78",
};

/** Chart chrome (grid, axes, labels) per theme. Plain colours, not CSS variables, so a chart saved as PNG
 *  (an SVG copied out of the page, where the page's CSS doesn't apply) keeps its colours. */
export const CHART_THEMES: Record<Theme, { grid: string; axis: string; text: string; muted: string; surface: string; background: string; foreground: string }> = {
  dark: {
    grid: "rgba(148, 178, 219, 0.10)",
    axis: "#7f93b0",
    text: "#c7d3e6",
    muted: "#7f93b0",
    surface: "#0b1a2e",
    background: "#0b1a2e",
    foreground: "#e7eef8",
  },
  light: {
    grid: "rgba(15, 40, 80, 0.10)",
    axis: "#5b6e89",
    text: "#1d2c42",
    muted: "#5b6e89",
    surface: "#ffffff",
    background: "#ffffff",
    foreground: "#0d1b2e",
  },
};

/** Dark chart colours (kept for the unused demo charts). */
export const CHART = CHART_THEMES.dark;

/** Chart colours for the current theme; charts re-render when the theme changes. */
export function useChart() {
  return CHART_THEMES[useTheme()];
}
