import type { RiskLevel, SatelliteSource } from "./types";

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

export const CHART = {
  grid: "rgba(148, 178, 219, 0.10)",
  axis: "#7f93b0",
  text: "#c7d3e6",
  muted: "#7f93b0",
  surface: "#0b1a2e",
};
