import type {
  FeatureImportance,
  ForecastHorizon,
  ModelInfo,
  RegionPrediction,
} from "@/lib/types";
import { riskFromProbability } from "@/lib/risk";

/**
 * DEMO DATA — Simulated model outputs.
 * These numbers are hand-authored placeholders that illustrate the shape of the
 * prediction API. They are NOT produced by a trained model.
 */

export const DEMO_MODEL: ModelInfo = {
  name: "Elevated Fire Activity Classifier",
  version: "0.0.0-demo",
  status: "simulated",
  target: "Elevated Fire Activity (detections above the regional 75th percentile for the horizon)",
  trainedOn: null,
  metrics: { precision: null, recall: null, f1: null, rocAuc: null },
  generatedAt: "2025-01-01T00:00:00Z",
};


type Row = { regionId: string; p: Record<ForecastHorizon, number>; base: number; change: Record<ForecastHorizon, number>; drivers: string[] };

const ROWS: Row[] = [
  { regionId: "central-africa", p: { "7d": 0.81, "14d": 0.77, "30d": 0.69 }, base: 210, change: { "7d": 0.34, "14d": 0.28, "30d": 0.19 }, drivers: ["Days since rainfall", "7-day detection lag", "Dry-season calendar"] },
  { regionId: "amazon", p: { "7d": 0.72, "14d": 0.76, "30d": 0.79 }, base: 160, change: { "7d": 0.22, "14d": 0.31, "30d": 0.38 }, drivers: ["Land surface temperature", "NDVI decline", "7-day detection lag"] },
  { regionId: "indonesia", p: { "7d": 0.58, "14d": 0.63, "30d": 0.66 }, base: 64, change: { "7d": 0.15, "14d": 0.21, "30d": 0.27 }, drivers: ["Precipitation anomaly", "Peatland fraction", "Relative humidity"] },
  { regionId: "california", p: { "7d": 0.47, "14d": 0.44, "30d": 0.36 }, base: 42, change: { "7d": 0.09, "14d": 0.05, "30d": -0.06 }, drivers: ["Wind speed", "Relative humidity", "Land surface temperature"] },
  { regionId: "mediterranean", p: { "7d": 0.31, "14d": 0.27, "30d": 0.2 }, base: 18, change: { "7d": 0.04, "14d": -0.02, "30d": -0.11 }, drivers: ["Wind speed", "Land surface temperature", "Month of year"] },
  { regionId: "siberia", p: { "7d": 0.22, "14d": 0.18, "30d": 0.12 }, base: 30, change: { "7d": -0.12, "14d": -0.18, "30d": -0.29 }, drivers: ["Month of year", "Snow cover", "7-day detection lag"] },
  { regionId: "british-columbia", p: { "7d": 0.17, "14d": 0.14, "30d": 0.1 }, base: 22, change: { "7d": -0.15, "14d": -0.21, "30d": -0.33 }, drivers: ["Month of year", "Relative humidity", "Precipitation anomaly"] },
  { regionId: "nsw", p: { "7d": 0.39, "14d": 0.46, "30d": 0.55 }, base: 26, change: { "7d": 0.07, "14d": 0.14, "30d": 0.23 }, drivers: ["Land surface temperature", "Days since rainfall", "Month of year"] },
];

const HORIZON_DAYS: Record<ForecastHorizon, number> = { "7d": 7, "14d": 14, "30d": 30 };

export function getDemoPredictions(): RegionPrediction[] {
  const out: RegionPrediction[] = [];
  for (const r of ROWS) {
    for (const h of Object.keys(HORIZON_DAYS) as ForecastHorizon[]) {
      const scale = HORIZON_DAYS[h] / 7;
      const mid = r.base * scale * (1 + r.change[h]);
      out.push({
        regionId: r.regionId,
        horizon: h,
        probability: r.p[h],
        risk: riskFromProbability(r.p[h]),
        expectedLow: Math.round(mid * 0.8),
        expectedHigh: Math.round(mid * 1.25),
        changeVsBaseline: r.change[h],
        topDrivers: r.drivers,
      });
    }
  }
  return out;
}

export const DEMO_FEATURE_IMPORTANCE: FeatureImportance[] = [
  { feature: "Detections (7-day lag)", description: "Count of active-fire detections in the previous 7 days", importance: 0.214, group: "Fire history" },
  { feature: "Days since rainfall", description: "Consecutive days without measurable precipitation", importance: 0.163, group: "Weather" },
  { feature: "Land surface temperature", description: "Mean daytime LST anomaly vs. climatology", importance: 0.131, group: "Weather" },
  { feature: "Mean FRP (30-day)", description: "Rolling mean Fire Radiative Power", importance: 0.104, group: "Fire history" },
  { feature: "NDVI anomaly", description: "Vegetation greenness vs. seasonal norm (fuel dryness proxy)", importance: 0.092, group: "Vegetation" },
  { feature: "Relative humidity", description: "Mean daily relative humidity", importance: 0.081, group: "Weather" },
  { feature: "Month of year", description: "Cyclical encoding of the calendar month", importance: 0.074, group: "Calendar" },
  { feature: "Wind speed", description: "Mean daily 10 m wind speed", importance: 0.058, group: "Weather" },
  { feature: "Elevation", description: "Mean terrain elevation of the grid cell", importance: 0.036, group: "Terrain" },
  { feature: "Land cover class", description: "Dominant vegetation / land cover type", importance: 0.029, group: "Vegetation" },
];
