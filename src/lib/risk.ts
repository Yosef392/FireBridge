import type { RiskLevel } from "./types";

/** Illustrative per-detection risk class from Fire Radiative Power (MW). Not a model output. */
export function riskFromFrp(frp: number): RiskLevel {
  if (frp >= 100) return "Extreme";
  if (frp >= 35) return "High";
  if (frp >= 12) return "Moderate";
  return "Low";
}

/** Map a model probability of elevated fire activity to a risk category. */
export function riskFromProbability(p: number): RiskLevel {
  if (p >= 0.75) return "Extreme";
  if (p >= 0.5) return "High";
  if (p >= 0.25) return "Moderate";
  return "Low";
}
