/**
 * Domain types shared by the UI, the demo data layer and the future FastAPI backend.
 * Field names deliberately mirror the NASA FIRMS active-fire CSV schema
 * (latitude, longitude, frp, acq_date, ...) so real exports can be mapped 1:1.
 */

export type SatelliteSource = "MODIS" | "VIIRS";
export type SourceFilter = SatelliteSource | "ALL";

export type RiskLevel = "Low" | "Moderate" | "High" | "Extreme";
export const RISK_LEVELS: RiskLevel[] = ["Low", "Moderate", "High", "Extreme"];

export type Confidence = "low" | "nominal" | "high";
export type Season = "Winter" | "Spring" | "Summer" | "Autumn";
export const SEASONS: Season[] = ["Winter", "Spring", "Summer", "Autumn"];

export interface Region {
  id: string;
  name: string;
  country: string;
  continent: string;
  hemisphere: "N" | "S";
  center: [number, number];
  /** Typical zoom level for the map when this region is selected. */
  zoom: number;
}

export interface FireDetection {
  id: string;
  latitude: number;
  longitude: number;
  /** ISO date, YYYY-MM-DD */
  acq_date: string;
  /** HHMM UTC */
  acq_time: string;
  source: SatelliteSource;
  satellite: "Terra" | "Aqua" | "Suomi NPP" | "NOAA-20";
  /** Fire Radiative Power in megawatts */
  frp: number;
  /** Brightness temperature (K) */
  brightness: number;
  confidence: Confidence;
  daynight: "D" | "N";
  regionId: string;
  /** Illustrative risk derived from FRP; not an operational classification. */
  risk: RiskLevel;
}

export type DatePreset = "30d" | "90d" | "12m" | "2024" | "2023" | "2022" | "all";

export interface DetectionFilters {
  preset: DatePreset;
  regionId: string | "ALL";
  source: SourceFilter;
}

export interface DateRange {
  start: string;
  end: string;
}

export type ForecastHorizon = "7d" | "14d" | "30d";

export interface RegionPrediction {
  regionId: string;
  horizon: ForecastHorizon;
  /** Probability of elevated fire activity in the horizon, 0..1 */
  probability: number;
  risk: RiskLevel;
  /** Expected detection count band */
  expectedLow: number;
  expectedHigh: number;
  /** Change vs. trailing baseline, as a fraction (0.25 = +25%) */
  changeVsBaseline: number;
  topDrivers: string[];
}

export interface FeatureImportance {
  feature: string;
  description: string;
  importance: number;
  group: "Fire history" | "Weather" | "Vegetation" | "Calendar" | "Terrain";
}

export interface ModelMetrics {
  precision: number | null;
  recall: number | null;
  f1: number | null;
  rocAuc: number | null;
}

export interface ModelInfo {
  name: string;
  version: string;
  status: "simulated" | "trained";
  target: string;
  trainedOn: string | null;
  metrics: ModelMetrics;
  generatedAt: string;
}

export interface PredictionResponse {
  model: ModelInfo;
  predictions: RegionPrediction[];
  featureImportance: FeatureImportance[];
  isDemo: boolean;
}

export interface DetectionResponse {
  range: DateRange;
  detections: FireDetection[];
  /** Detections in the equal-length window before `range`, for deltas. */
  previous: FireDetection[];
  isDemo: boolean;
}
