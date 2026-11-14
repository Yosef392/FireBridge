/**
 * Harmonized MODIS → VIIRS fire records, exported by notebooks/5_Export.ipynb into public/data/.
 *
 * These are real NASA FIRMS results (not demo data), served as static JSON so the app needs no backend:
 *   /data/regions.json              study regions (bbox, fire type, known event)
 *   /data/calendar_<regionId>.json  every month of the record: raw MODIS, real VIIRS, harmonized + band
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
  split: { train_until: number; val_years: number[]; test_from: number; /** Last scored year (later months are shown, not scored). */ test_until?: number };
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

/**
 * Static files never change while the app is open, so each one is fetched once and shared by every
 * page (regions.json and model.json used to be downloaded again on each page). A failed fetch is
 * dropped from the cache so Retry works. Aborting only stops the caller waiting, not the shared fetch.
 */
const staticCache = new Map<string, Promise<unknown>>();

function loadStatic(path: string): Promise<unknown> {
  let p = staticCache.get(path);
  if (!p) {
    p = (async () => {
      let res: Response;
      try {
        res = await fetch(`/data/${path}`, { headers: { Accept: "application/json" } });
      } catch {
        throw new Error(`Could not load /data/${path}.`);
      }
      if (!res.ok) {
        throw new Error(`Data file /data/${path} is missing (${res.status}). Run notebook 5 and copy its output into public/data/.`);
      }
      return res.json();
    })();
    p.catch(() => staticCache.delete(path));
    staticCache.set(path, p);
  }
  return p;
}

function getStatic<T>(path: string, signal?: AbortSignal): Promise<T> {
  const p = loadStatic(path) as Promise<T>;
  if (!signal) return p;
  if (signal.aborted) return Promise.reject(new DOMException("Aborted", "AbortError"));
  return new Promise<T>((resolve, reject) => {
    const onAbort = () => reject(new DOMException("Aborted", "AbortError"));
    signal.addEventListener("abort", onAbort, { once: true });
    p.then(resolve, reject).finally(() => signal.removeEventListener("abort", onAbort));
  });
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
  /** The record we show: real VIIRS from viirsFrom on, the model estimate before. */
  calendar: number;
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
        calendar: sum(list, (m) => m.calendar),
        low,
        high,
        raw: year < viirsFrom ? modis : viirs,
        band: [low, high] as [number, number],
      };
    });
}

/* ---------------------------------------------------------------- whole-dataset helpers */

export interface RegionCalendar {
  region: HarmonizedRegion;
  months: CalendarMonth[];
  years: YearRow[];
}

/** Region list + every region's calendar (about 300 kB in total). */
export async function fetchAllCalendars(viirsFrom: number, signal?: AbortSignal): Promise<RegionCalendar[]> {
  const regions = await fetchHarmonizedRegions(signal);
  return Promise.all(
    regions.map(async (region) => {
      const { months } = await fetchCalendar(region.id, signal);
      return { region, months, years: yearlyRows(months, viirsFrom) };
    }),
  );
}

export const regionLabel = (r: Pick<HarmonizedRegion, "name" | "country">) => `${r.name}, ${r.country}`;

/** Average share of the year's fires that falls in each calendar month (harmonized record, whole years only). */
export function seasonalProfile(months: CalendarMonth[]): number[] {
  const byYear = new Map<string, CalendarMonth[]>();
  for (const m of months) {
    const y = m.month.slice(0, 4);
    const l = byYear.get(y);
    if (l) l.push(m);
    else byYear.set(y, [m]);
  }
  const shares = Array(12).fill(0);
  let n = 0;
  for (const list of byYear.values()) {
    if (list.length !== 12) continue;
    const total = list.reduce((s, m) => s + (m.calendar ?? 0), 0);
    if (total <= 0) continue;
    for (const m of list) shares[Number(m.month.slice(5, 7)) - 1] += (m.calendar ?? 0) / total;
    n++;
  }
  return shares.map((s) => (n ? s / n : 0));
}

/* ---------------------------------------------------------------- map cells */

export interface CellIndex {
  regionId: string;
  gridKm: number;
  /** Rectangle per cell: [latMin, lonMin, latMax, lonMax] */
  cells: [number, number, number, number][];
}

/** One cell-month: [cell index, harmonized, MODIS count, VIIRS count (null before VIIRS)] */
export type CellValue = [number, number, number, number | null];

export interface CellYear {
  regionId: string;
  year: number;
  /** Keyed by month "01".."12"; only cells with any activity are listed. */
  months: Record<string, CellValue[]>;
}

export const fetchCellIndex = (regionId: string, signal?: AbortSignal) => getStatic<CellIndex>(`cells/${regionId}/index.json`, signal);
/**
 * One year of map cells. Notebook 5 writes no file for a year without any detection (e.g. Canada's
 * winter months in 2000), so a missing file is an empty year, not an error.
 */
export const fetchCellYear = (regionId: string, year: number, signal?: AbortSignal) =>
  getStatic<CellYear>(`cells/${regionId}/${year}.json`, signal).catch((e: Error) => {
    if (e.name !== "AbortError" && e.message.includes("(404)")) return { regionId, year, months: {} } as CellYear;
    throw e;
  });

/* ---------------------------------------------------------------- month vs. history */

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface MonthComparison {
  month: string;
  value: number;
  source: "VIIRS" | "model";
  /** Same calendar month in every other year of the harmonized record. */
  median: number;
  p25: number;
  p75: number;
  min: number;
  max: number;
  years: number;
  /** 1 = the busiest of all years for this calendar month. */
  rank: number;
  /** value ÷ median − 1 (null when the median is 0). */
  vsMedian: number | null;
  /** Median over VIIRS years only (no model estimates), for comparison. */
  viirsMedian: number | null;
  /** Each year's value for this calendar month, oldest first. */
  history: { year: number; value: number; source: "VIIRS" | "model" }[];
}

/**
 * How one month compares with the same calendar month in the other years: the
 * "this month vs. the historical median" view fire managers asked for.
 */
export function compareMonth(months: CalendarMonth[], month: string, viirsFrom: number): MonthComparison | null {
  const target = months.find((m) => m.month === month);
  if (!target || target.calendar == null) return null;
  const mm = month.slice(5, 7);
  const history = months
    .filter((m) => m.month.slice(5, 7) === mm && m.calendar != null)
    .map((m) => ({ year: Number(m.month.slice(0, 4)), value: m.calendar as number, source: m.source }));
  const others = history.filter((h) => h.year !== Number(month.slice(0, 4)));
  const vals = others.map((h) => h.value).sort((a, b) => a - b);
  const viirsVals = others.filter((h) => h.year >= viirsFrom).map((h) => h.value).sort((a, b) => a - b);
  const median = quantile(vals, 0.5);
  return {
    month,
    value: target.calendar,
    source: target.source,
    median,
    p25: quantile(vals, 0.25),
    p75: quantile(vals, 0.75),
    min: vals[0] ?? NaN,
    max: vals.at(-1) ?? NaN,
    years: vals.length,
    rank: 1 + vals.filter((v) => v > target.calendar!).length,
    vsMedian: median > 0 ? target.calendar / median - 1 : null,
    viirsMedian: viirsVals.length ? quantile(viirsVals, 0.5) : null,
    history,
  };
}

/* ---------------------------------------------------------------- trend */

export interface Trend {
  /** Theil–Sen slope: detections per year. */
  slope: number;
  intercept: number;
  /** slope as a share of the median yearly total. */
  pctPerYear: number;
  /** Mann–Kendall two-sided p-value (normal approximation, no tie correction). */
  p: number;
  significant: boolean;
  from: number;
  to: number;
}

function normalCdf(z: number) {
  // Abramowitz–Stegun 7.1.26
  const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2);
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(z * z) / 2);
  return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

/** Theil–Sen slope + Mann–Kendall test over yearly totals: robust to one extreme fire year. */
export function yearlyTrend(points: { year: number; value: number }[]): Trend | null {
  const pts = points.filter((p) => Number.isFinite(p.value));
  const n = pts.length;
  if (n < 5) return null;
  const slopes: number[] = [];
  let s = 0;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++) {
      slopes.push((pts[j].value - pts[i].value) / (pts[j].year - pts[i].year));
      s += Math.sign(pts[j].value - pts[i].value);
    }
  slopes.sort((a, b) => a - b);
  const slope = quantile(slopes, 0.5);
  const intercept = quantile(pts.map((p) => p.value - slope * p.year).sort((a, b) => a - b), 0.5);
  const varS = (n * (n - 1) * (2 * n + 5)) / 18;
  const z = s > 0 ? (s - 1) / Math.sqrt(varS) : s < 0 ? (s + 1) / Math.sqrt(varS) : 0;
  const p = 2 * (1 - normalCdf(Math.abs(z)));
  const med = quantile(pts.map((x) => x.value).sort((a, b) => a - b), 0.5);
  return { slope, intercept, pctPerYear: med > 0 ? slope / med : 0, p, significant: p < 0.05, from: pts[0].year, to: pts[n - 1].year };
}

/* ---------------------------------------------------------------- custom area */

/** [latMin, lonMin, latMax, lonMax] — same order as the cell rectangles. */
export type AreaBox = [number, number, number, number];

/** Cells whose centre falls inside the box. */
export function cellsInBox(index: CellIndex, box: AreaBox): Set<number> {
  const out = new Set<number>();
  index.cells.forEach((b, i) => {
    const lat = (b[0] + b[2]) / 2;
    const lon = (b[1] + b[3]) / 2;
    if (lat >= box[0] && lat <= box[2] && lon >= box[1] && lon <= box[3]) out.add(i);
  });
  return out;
}

/**
 * Monthly calendar for a user-drawn box, summed from the per-cell files.
 * Cell files only list active cells, so a missing cell-month counts as zero.
 * There is no model band at cell level, so low/high stay null.
 */
export function areaCalendar(years: CellYear[], cells: Set<number>, viirsFrom: number): CalendarMonth[] {
  const out: CalendarMonth[] = [];
  for (const cy of [...years].sort((a, b) => a.year - b.year)) {
    for (let m = 1; m <= 12; m++) {
      const key = String(m).padStart(2, "0");
      const month = `${cy.year}-${key}`;
      if (month < MODIS_ARCHIVE_START) continue;
      let h = 0;
      let mo = 0;
      let v = 0;
      let hasV = false;
      for (const [c, hv, mv, vv] of cy.months[key] ?? []) {
        if (!cells.has(c)) continue;
        h += hv;
        mo += mv;
        if (vv != null) {
          v += vv;
          hasV = true;
        }
      }
      const viirsEra = cy.year >= viirsFrom;
      const viirs = viirsEra || hasV ? v : null;
      out.push({
        month,
        modis: mo,
        terra: 0,
        aqua: 0,
        viirs,
        harmonized: h,
        low: null,
        high: null,
        calendar: viirsEra ? v : h,
        source: viirsEra ? "VIIRS" : "model",
      });
    }
  }
  return out;
}

/* ---------------------------------------------------------------- daily record */

/** daily_<regionId>.json from notebook 5: one entry per day from `start`, [modis, viirs|null, harmonized]. */
export interface DailyFile {
  regionId: string;
  start: string;
  viirsFrom: number;
  days: [number, number | null, number | null][];
}

/** The daily file, or null when notebook 5 hasn't exported it yet (older exports have no daily data). */
export async function fetchDaily(regionId: string, signal?: AbortSignal): Promise<DailyFile | null> {
  const res = await fetch(`/data/daily_${regionId}.json`, { signal, headers: { Accept: "application/json" } });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not load /data/daily_${regionId}.json (${res.status}).`);
  return res.json() as Promise<DailyFile>;
}

const DAY_MS = 86_400_000;
const isoDay = (t: number) => new Date(t).toISOString().slice(0, 10);

export interface DayView {
  date: string;
  modis: number;
  viirs: number | null;
  harmonized: number;
  source: "VIIRS" | "model";
  /** Hotspots in the 7 days centred on `date`. */
  window: number;
  /** The same 7-day window in every other year. */
  windowHistory: { year: number; value: number }[];
  windowMedian: number;
  windowRank: number;
  /** Every day of the date's month, for a bar chart. */
  month: { date: string; value: number; source: "VIIRS" | "model" }[];
}

/** One day, its week against the same week in other years, and its month day by day. */
export function dayView(file: DailyFile, date: string): DayView | null {
  const t0 = Date.parse(`${file.start}T00:00:00Z`);
  const at = (t: number) => file.days[Math.round((t - t0) / DAY_MS)];
  const t = Date.parse(`${date}T00:00:00Z`);
  const row = at(t);
  if (!row) return null;
  const year = Number(date.slice(0, 4));
  const value = (r: DailyFile["days"][number] | undefined) => (r ? (r[2] ?? 0) : null);
  const windowSum = (center: number) => {
    let s = 0;
    for (let k = -3; k <= 3; k++) {
      const v = value(at(center + k * DAY_MS));
      if (v == null) return null; // window runs off the record
      s += v;
    }
    return s;
  };
  const firstYear = Number(file.start.slice(0, 4));
  const lastYear = Number(isoDay(t0 + (file.days.length - 1) * DAY_MS).slice(0, 4));
  const windowHistory: { year: number; value: number }[] = [];
  for (let y = firstYear; y <= lastYear; y++) {
    const md = date.slice(5);
    if (md === "02-29" && !(y % 4 === 0 && (y % 100 !== 0 || y % 400 === 0))) continue;
    const v = windowSum(Date.parse(`${y}-${md}T00:00:00Z`));
    if (v != null) windowHistory.push({ year: y, value: v });
  }
  const others = windowHistory.filter((h) => h.year !== year).map((h) => h.value).sort((a, b) => a - b);
  const win = windowSum(t) ?? value(row) ?? 0;
  const ym = date.slice(0, 7);
  const month: DayView["month"] = [];
  for (let d = Date.parse(`${ym}-01T00:00:00Z`); isoDay(d).startsWith(ym); d += DAY_MS) {
    const r = at(d);
    if (r) month.push({ date: isoDay(d), value: r[2] ?? 0, source: Number(ym.slice(0, 4)) >= file.viirsFrom ? "VIIRS" : "model" });
  }
  return {
    date,
    modis: row[0],
    viirs: row[1],
    harmonized: row[2] ?? 0,
    source: year >= file.viirsFrom ? "VIIRS" : "model",
    window: win,
    windowHistory,
    windowMedian: quantile(others, 0.5),
    windowRank: 1 + others.filter((v) => v > win).length,
    month,
  };
}

export const dailyRange = (file: DailyFile) => ({
  first: file.start,
  last: isoDay(Date.parse(`${file.start}T00:00:00Z`) + (file.days.length - 1) * DAY_MS),
});

/* ---------------------------------------------------------------- dataset coverage */

export interface Coverage {
  regionCount: number;
  /** YYYY-MM: first and last month that has a value in any region. */
  firstMonth: string;
  lastMonth: string;
  /** First and last year with all 12 months (what yearly charts and trends use). */
  firstFullYear: number;
  lastFullYear: number;
  /** Every year with at least one month of data, newest first. */
  years: number[];
  viirsFrom: number;
  trainUntil: number | null;
  valYears: number[];
  testFrom: number | null;
  /** Last year in the test period: the report's test_until, else the last year with data. */
  testTo: number;
}

const MONTH_ABBR = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
/** "2026-10" → "Oct 2026" */
export const fmtMonth = (ym: string) => `${MONTH_ABBR[Number(ym.slice(5, 7)) - 1]} ${ym.slice(0, 4)}`;

/** What the exported data actually covers, so no page has to hard-code years or the number of regions. */
export function coverageOf(cals: RegionCalendar[], report: ModelReport | null): Coverage {
  const months = cals.flatMap((c) => c.months.filter((m) => m.calendar != null).map((m) => m.month)).sort();
  const full = cals.flatMap((c) => c.years.map((y) => y.year));
  const years = [...new Set(months.map((m) => Number(m.slice(0, 4))))].sort((a, b) => b - a);
  const firstMonth = months[0] ?? MODIS_ARCHIVE_START;
  const lastMonth = months.at(-1) ?? firstMonth;
  return {
    regionCount: cals.length,
    firstMonth,
    lastMonth,
    firstFullYear: full.length ? Math.min(...full) : Number(firstMonth.slice(0, 4)),
    lastFullYear: full.length ? Math.max(...full) : Number(lastMonth.slice(0, 4)),
    years,
    viirsFrom: report?.viirs_from ?? 2013,
    trainUntil: report?.split.train_until ?? null,
    valYears: report?.split.val_years ?? [],
    testFrom: report?.split.test_from ?? null,
    testTo: report?.split.test_until ?? Number(lastMonth.slice(0, 4)),
  };
}

/** Coverage straight from the files (shares the cached downloads with the pages). */
export async function fetchCoverage(signal?: AbortSignal): Promise<Coverage> {
  const report = await fetchModelReport(signal).catch((e) => {
    if ((e as Error).name === "AbortError") throw e;
    return null;
  });
  const cals = await fetchAllCalendars(report?.viirs_from ?? 2013, signal);
  return coverageOf(cals, report);
}

/* ---------------------------------------------------------------- drawn areas (rectangle, polygon, circle) */

export type AreaShape =
  | { kind: "rect"; box: AreaBox }
  /** Vertices as [lat, lon], not closed (the last point joins the first). */
  | { kind: "polygon"; points: [number, number][] }
  | { kind: "circle"; center: [number, number]; radiusKm: number };

const EARTH_KM = 6371.0088;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Is the point inside the shape? (Polygons: even-odd ray casting in lat/lon, fine at regional scale.) */
export function inShape(shape: AreaShape, lat: number, lon: number): boolean {
  switch (shape.kind) {
    case "rect": {
      const [a, b, c, d] = shape.box;
      return lat >= a && lat <= c && lon >= b && lon <= d;
    }
    case "circle":
      return distanceKm(shape.center[0], shape.center[1], lat, lon) <= shape.radiusKm;
    case "polygon": {
      const p = shape.points;
      let inside = false;
      for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
        const [yi, xi] = p[i];
        const [yj, xj] = p[j];
        if (yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi) inside = !inside;
      }
      return inside;
    }
  }
}

/** Bounding box [latMin, lonMin, latMax, lonMax]. */
export function shapeBounds(shape: AreaShape): AreaBox {
  if (shape.kind === "rect") return shape.box;
  if (shape.kind === "circle") {
    const [lat, lon] = shape.center;
    const dLat = shape.radiusKm / 111.32;
    const dLon = shape.radiusKm / (111.32 * Math.max(0.01, Math.cos(rad(lat))));
    return [lat - dLat, lon - dLon, lat + dLat, lon + dLon];
  }
  const lats = shape.points.map((p) => p[0]);
  const lons = shape.points.map((p) => p[1]);
  return [Math.min(...lats), Math.min(...lons), Math.max(...lats), Math.max(...lons)];
}

export function shapeLabel(shape: AreaShape): string {
  const f = (v: number) => v.toFixed(2);
  if (shape.kind === "rect") return `Box ${f(shape.box[0])}…${f(shape.box[2])}°N, ${f(shape.box[1])}…${f(shape.box[3])}°E`;
  if (shape.kind === "circle") return `${shape.radiusKm.toFixed(0)} km around ${f(shape.center[0])}°N, ${f(shape.center[1])}°E`;
  return `Polygon, ${shape.points.length} points`;
}

/** Cells whose centre is inside the shape. */
export function cellsInShape(index: CellIndex, shape: AreaShape): Set<number> {
  const [a, b, c, d] = shapeBounds(shape);
  const out = new Set<number>();
  index.cells.forEach((cb, i) => {
    const lat = (cb[0] + cb[2]) / 2;
    const lon = (cb[1] + cb[3]) / 2;
    if (lat >= a && lat <= c && lon >= b && lon <= d && inShape(shape, lat, lon)) out.add(i);
  });
  return out;
}

/** Do two boxes [latMin, lonMin, latMax, lonMax] overlap? */
export const boxesOverlap = (p: AreaBox, q: AreaBox) => p[0] <= q[2] && q[0] <= p[2] && p[1] <= q[3] && q[1] <= p[3];

/** Sum several monthly calendars (e.g. one drawn area across several regions) month by month. */
export function sumCalendars(parts: CalendarMonth[][]): CalendarMonth[] {
  const by = new Map<string, CalendarMonth>();
  for (const months of parts)
    for (const m of months) {
      const t = by.get(m.month);
      if (!t) {
        by.set(m.month, { ...m });
        continue;
      }
      t.modis += m.modis;
      t.terra += m.terra;
      t.aqua += m.aqua;
      t.viirs = t.viirs == null && m.viirs == null ? null : (t.viirs ?? 0) + (m.viirs ?? 0);
      t.harmonized = (t.harmonized ?? 0) + (m.harmonized ?? 0);
      t.calendar = (t.calendar ?? 0) + (m.calendar ?? 0);
    }
  return [...by.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Area <-> URL (?area=...), so a drawn area can be shared as a link. */
export function shapeToParam(s: AreaShape): string {
  const f = (v: number) => v.toFixed(4).replace(/\.?0+$/, "");
  if (s.kind === "rect") return `rect:${s.box.map(f).join(",")}`;
  if (s.kind === "circle") return `circle:${f(s.center[0])},${f(s.center[1])},${f(s.radiusKm)}`;
  return `poly:${s.points.map((p) => `${f(p[0])},${f(p[1])}`).join(";")}`;
}

export function shapeFromParam(v: string | null): AreaShape | null {
  if (!v) return null;
  const [kind, rest = ""] = v.split(":");
  const nums = (t: string) => t.split(",").map(Number);
  const ok = (a: number[], n: number) => a.length === n && a.every(Number.isFinite);
  if (kind === "rect") {
    const b = nums(rest);
    return ok(b, 4) && b[0] < b[2] && b[1] < b[3] ? { kind: "rect", box: b as AreaBox } : null;
  }
  if (kind === "circle") {
    const c = nums(rest);
    return ok(c, 3) && c[2] > 0 ? { kind: "circle", center: [c[0], c[1]], radiusKm: c[2] } : null;
  }
  if (kind === "poly") {
    const pts = rest.split(";").map(nums);
    return pts.length >= 3 && pts.every((p) => ok(p, 2)) ? { kind: "polygon", points: pts as [number, number][] } : null;
  }
  return null;
}
