/**
 * Harmonized MODIS → VIIRS fire records, exported by notebooks/5_Export.ipynb into public/data/.
 *
 * These are real NASA FIRMS results (not demo data), served as static JSON so the app needs no backend:
 *   /data/regions.json              study regions (bbox, fire type, known event)
 *   /data/calendar_<regionId>.json  every month 2000–2024: raw MODIS, real VIIRS, harmonized + band
 *   /data/model.json                model scores, 2012 jump check, anomalies
 *   /data/cells/<regionId>/...      per-cell values for the map
 */

export interface HarmonizedRegion {
  id: string;
  name: string;
  country: string;
  priority: "Core" | "Optional";
  fireType: string;
  goal: string;
  /** [latMin, latMax, lonMin, lonMax] */
  bbox: [number, number, number, number];
  center: [number, number];
  zoom: number;
  hemisphere: "N" | "S";
  /** Documented fire event used as a validation check (YYYY-MM-DD). */
  eventStart: string;
  eventEnd: string;
}

export interface CalendarMonth {
  /** YYYY-MM */
  month: string;
  modis: number;
  terra: number;
  aqua: number;
  /** Real VIIRS detections; null before VIIRS (the months the model fills in). */
  viirs: number | null;
  /** Model estimate of VIIRS-equivalent detections, every month. */
  harmonized: number | null;
  low: number | null;
  high: number | null;
  /** What the calendar shows: real VIIRS where it exists, the model before. */
  calendar: number | null;
  source: "VIIRS" | "model";
}

export interface CalendarFile {
  regionId: string;
  months: CalendarMonth[];
}

export interface ScoreRow {
  model?: string;
  poisson_deviance_cell: number;
  /** % */
  total_bias: number;
  /** % */
  monthly_wape: number;
  monthly_corr: number | null;
}

export interface JumpRow {
  area: string;
  /** VIIRS 2013–15 ÷ MODIS 2009–11: the fake step when the raw records are joined */
  raw_jump: number;
  /** MODIS 2013–15 ÷ MODIS 2009–11: the true change in fire activity */
  real_change: number;
  /** VIIRS 2013–15 ÷ harmonized 2009–11: should be close to real_change */
  harmonized_jump: number;
}

export interface AnomalyRow {
  area: string;
  month: string;
  calendar: number;
  source: "VIIRS" | "model";
  z: number;
  in_event?: boolean;
}

export interface ModelReport {
  grid_km: number;
  years: [number, number];
  viirs_from: number;
  split: { train_until: number; val_years: number[]; test_from: number };
  features: string[];
  model: string;
  members: number;
  generated_at: string;
  validation: ScoreRow[];
  test_overall: ScoreRow[];
  test_by_region: (ScoreRow & { area: string })[];
  leave_one_region_out: (ScoreRow & { held_out: string })[];
  jump_check: JumpRow[];
  anomalies: AnomalyRow[];
}

async function getStatic<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`/data/${path}`, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new Error(`Could not load /data/${path}.`);
  }
  if (!res.ok) {
    throw new Error(`Data file /data/${path} is missing (${res.status}). Run notebook 5 and copy its output into public/data/.`);
  }
  return res.json() as Promise<T>;
}

export const fetchHarmonizedRegions = (signal?: AbortSignal) => getStatic<HarmonizedRegion[]>("regions.json", signal);
/** The FIRMS MODIS archive starts in November 2000; earlier months have no observations to harmonize. */
export const MODIS_ARCHIVE_START = "2000-11";

export const fetchCalendar = (regionId: string, signal?: AbortSignal) =>
  getStatic<CalendarFile>(`calendar_${regionId}.json`, signal).then((file) => ({
    ...file,
    months: file.months.filter((m) => m.month >= MODIS_ARCHIVE_START),
  }));
export const fetchModelReport = (signal?: AbortSignal) => getStatic<ModelReport>("model.json", signal);

/* ---------------------------------------------------------------- aggregation */

export type CalendarMetric = "calendar" | "raw" | "modis" | "viirs";

/** Value shown in a calendar cell for a metric. "raw" = MODIS before VIIRS, VIIRS after (the naive join). */
export function metricValue(m: CalendarMonth, metric: CalendarMetric, viirsFrom: number): number | null {
  const year = Number(m.month.slice(0, 4));
  switch (metric) {
    case "calendar":
      return m.calendar;
    case "modis":
      return m.modis;
    case "viirs":
      return m.viirs;
    case "raw":
      return year < viirsFrom ? m.modis : m.viirs;
    default:
      return null;
  }
}

export interface YearRow {
  year: number;
  modis: number;
  viirs: number | null;
  harmonized: number;
  low: number;
  high: number;
  /** Naive join: MODIS before VIIRS, VIIRS after. */
  raw: number | null;
  /** Range for the uncertainty band. */
  band: [number, number];
}

export function yearlyRows(months: CalendarMonth[], viirsFrom: number): YearRow[] {
  const byYear = new Map<number, CalendarMonth[]>();
  for (const m of months) {
    const y = Number(m.month.slice(0, 4));
    const list = byYear.get(y);
    if (list) list.push(m);
    else byYear.set(y, [m]);
  }
  const sum = (list: CalendarMonth[], f: (m: CalendarMonth) => number | null) => list.reduce((s, m) => s + (f(m) ?? 0), 0);
  return [...byYear.entries()]
    // Only whole years: 2000 has just Nov–Dec, which would look like a fake low.
    .filter(([, list]) => list.length === 12)
    .sort(([a], [b]) => a - b)
    .map(([year, list]) => {
      const hasViirs = list.some((m) => m.viirs != null);
      const modis = sum(list, (m) => m.modis);
      const viirs = hasViirs ? sum(list, (m) => m.viirs) : null;
      const low = sum(list, (m) => m.low);
      const high = sum(list, (m) => m.high);
      return {
        year,
        modis,
        viirs,
        harmonized: sum(list, (m) => m.harmonized),
        low,
        high,
        raw: year < viirsFrom ? modis : viirs,
        band: [low, high] as [number, number],
      };
    });
}
