import type { Region } from "@/lib/types";

/**
 * DEMO DATA — Region catalogue used by the illustrative dataset.
 * Geography is real; all fire statistics generated for these regions are fictional.
 */
export const REGIONS: Region[] = [
  { id: "california", name: "California", country: "United States", continent: "North America", hemisphere: "N", center: [37.2, -119.8], zoom: 6 },
  { id: "british-columbia", name: "British Columbia", country: "Canada", continent: "North America", hemisphere: "N", center: [53.0, -122.5], zoom: 5 },
  { id: "amazon", name: "Amazon Basin", country: "Brazil", continent: "South America", hemisphere: "S", center: [-9.0, -58.0], zoom: 5 },
  { id: "mediterranean", name: "Eastern Mediterranean", country: "Greece & Türkiye", continent: "Europe", hemisphere: "N", center: [38.4, 25.5], zoom: 6 },
  { id: "central-africa", name: "Central Africa", country: "Angola & DR Congo", continent: "Africa", hemisphere: "S", center: [-9.0, 21.0], zoom: 5 },
  { id: "siberia", name: "Eastern Siberia", country: "Russia", continent: "Asia", hemisphere: "N", center: [60.5, 115.0], zoom: 4 },
  { id: "nsw", name: "New South Wales", country: "Australia", continent: "Oceania", hemisphere: "S", center: [-33.3, 150.3], zoom: 6 },
  { id: "indonesia", name: "Sumatra & Borneo", country: "Indonesia", continent: "Asia", hemisphere: "S", center: [-1.2, 107.5], zoom: 5 },
];

export const REGION_BY_ID: Record<string, Region> = Object.fromEntries(REGIONS.map((r) => [r.id, r]));

/** Generator parameters (internal to the demo dataset). */
export interface RegionProfile {
  id: string;
  /** Mean daily detections at seasonal peak */
  peakRate: number;
  /** Peak month, 1-12 (fractional allowed) */
  peakMonth: number;
  /** Seasonal width in months */
  width: number;
  /** Off-season floor as a fraction of the peak */
  floor: number;
  /** Cluster centres [lat, lon, spreadDeg] */
  clusters: [number, number, number][];
  /** Year multipliers for 2020..2024 */
  years: [number, number, number, number, number];
  /** Median FRP multiplier (vegetation / fire type) */
  intensity: number;
}

export const REGION_PROFILES: RegionProfile[] = [
  { id: "california", peakRate: 9, peakMonth: 8.2, width: 1.4, floor: 0.04, intensity: 1.6, years: [1.45, 1.2, 0.7, 0.55, 0.8],
    clusters: [[39.7, -121.6, 0.9], [37.3, -119.6, 0.8], [34.4, -118.3, 0.6], [40.8, -123.0, 0.7]] },
  { id: "british-columbia", peakRate: 8, peakMonth: 7.7, width: 1.2, floor: 0.02, intensity: 1.4, years: [0.5, 1.3, 0.8, 1.7, 1.1],
    clusters: [[52.7, -124.3, 1.1], [50.6, -120.4, 0.9], [56.8, -122.4, 1.2], [58.7, -122.7, 0.9]] },
  { id: "amazon", peakRate: 24, peakMonth: 8.9, width: 1.5, floor: 0.06, intensity: 1.0, years: [1.25, 1.0, 1.1, 0.8, 1.35],
    clusters: [[-9.6, -63.1, 1.4], [-7.4, -55.4, 1.5], [-11.2, -52.5, 1.3], [-6.5, -48.9, 1.0]] },
  { id: "mediterranean", peakRate: 5, peakMonth: 7.6, width: 0.9, floor: 0.02, intensity: 1.3, years: [0.8, 1.5, 0.9, 1.4, 1.0],
    clusters: [[38.1, 21.9, 0.5], [37.0, 29.2, 0.6], [39.6, 23.0, 0.5], [41.0, 26.2, 0.5]] },
  { id: "central-africa", peakRate: 30, peakMonth: 7.0, width: 1.6, floor: 0.08, intensity: 0.7, years: [1.0, 1.05, 0.95, 1.0, 1.1],
    clusters: [[-9.3, 17.8, 1.5], [-7.2, 23.4, 1.6], [-11.6, 20.9, 1.4], [-5.4, 19.5, 1.2]] },
  { id: "siberia", peakRate: 14, peakMonth: 7.1, width: 1.1, floor: 0.01, intensity: 1.2, years: [1.3, 1.6, 0.9, 0.85, 0.95],
    clusters: [[62.1, 129.4, 1.8], [58.3, 112.0, 1.6], [60.4, 100.5, 1.5], [65.2, 121.3, 1.6]] },
  { id: "nsw", peakRate: 9, peakMonth: 12.5, width: 1.3, floor: 0.04, intensity: 1.5, years: [1.6, 0.5, 0.45, 0.8, 1.05],
    clusters: [[-33.6, 150.2, 0.6], [-31.2, 152.1, 0.6], [-35.6, 149.4, 0.5], [-29.5, 152.4, 0.5]] },
  { id: "indonesia", peakRate: 12, peakMonth: 9.1, width: 1.0, floor: 0.05, intensity: 0.9, years: [0.6, 0.65, 0.5, 1.45, 0.9],
    clusters: [[-2.6, 104.4, 0.8], [-1.8, 113.6, 1.0], [0.6, 101.6, 0.7], [-0.3, 109.8, 0.7]] },
];
