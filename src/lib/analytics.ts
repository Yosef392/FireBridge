import type { DateRange, FireDetection, RiskLevel, Season } from "./types";
import { RISK_LEVELS, SEASONS } from "./types";
import { MONTH_LABELS, daysIn, parseISO, toISO } from "./dates";
import { REGION_BY_ID, REGIONS } from "@/data/demo/regions";

/** Pure aggregation helpers. They work identically on demo data and API data. */

export const HOTSPOT_CELL_DEG = 0.5;
export const HOTSPOT_MIN_DETECTIONS = 5;
export const HIGH_RISK_FRP = 35;

const cellKey = (d: FireDetection) =>
  `${Math.floor(d.latitude / HOTSPOT_CELL_DEG)}:${Math.floor(d.longitude / HOTSPOT_CELL_DEG)}`;

export interface Kpis {
  total: number;
  activeHotspots: number;
  avgFrp: number;
  highRiskAreas: number;
}

export function computeKpis(list: FireDetection[]): Kpis {
  const cells = new Map<string, { n: number; frp: number; hi: number }>();
  let frp = 0;
  for (const d of list) {
    frp += d.frp;
    const k = cellKey(d);
    const c = cells.get(k) ?? { n: 0, frp: 0, hi: 0 };
    c.n++;
    c.frp += d.frp;
    if (d.risk === "High" || d.risk === "Extreme") c.hi++;
    cells.set(k, c);
  }
  let active = 0;
  let highRisk = 0;
  for (const c of cells.values()) {
    if (c.n >= HOTSPOT_MIN_DETECTIONS) {
      active++;
      if (c.hi / c.n >= 0.3) highRisk++;
    }
  }
  return { total: list.length, activeHotspots: active, avgFrp: list.length ? frp / list.length : 0, highRiskAreas: highRisk };
}

export function pctChange(curr: number, prev: number): number | null {
  if (!prev) return null;
  return (curr - prev) / prev;
}

export type Granularity = "day" | "week" | "month";

export function pickGranularity(range: DateRange): Granularity {
  const n = daysIn(range);
  if (n <= 92) return "day";
  if (n <= 400) return "week";
  return "month";
}

function bucketKey(iso: string, g: Granularity) {
  if (g === "day") return iso;
  if (g === "month") return `${iso.slice(0, 7)}-01`;
  const t = parseISO(iso);
  const dow = (new Date(t).getUTCDay() + 6) % 7; // Monday start
  return toISO(t - dow * 86_400_000);
}

export interface TimePoint {
  date: string;
  MODIS: number;
  VIIRS: number;
  total: number;
  avgFrp: number;
}

export function timeSeries(list: FireDetection[], range: DateRange, g: Granularity): TimePoint[] {
  const map = new Map<string, TimePoint & { frpSum: number }>();
  // Seed every bucket so gaps show as zero rather than being skipped.
  for (let t = parseISO(range.start); t <= parseISO(range.end); t += 86_400_000) {
    const k = bucketKey(toISO(t), g);
    if (!map.has(k)) map.set(k, { date: k, MODIS: 0, VIIRS: 0, total: 0, avgFrp: 0, frpSum: 0 });
  }
  for (const d of list) {
    const p = map.get(bucketKey(d.acq_date, g));
    if (!p) continue;
    p[d.source]++;
    p.total++;
    p.frpSum += d.frp;
  }
  return [...map.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .map(({ frpSum, ...p }) => ({ ...p, avgFrp: p.total ? +(frpSum / p.total).toFixed(1) : 0 }));
}

export interface MonthPoint {
  month: string;
  MODIS: number;
  VIIRS: number;
  total: number;
}

export function byCalendarMonth(list: FireDetection[]): MonthPoint[] {
  const rows = MONTH_LABELS.map((m) => ({ month: m, MODIS: 0, VIIRS: 0, total: 0 }));
  for (const d of list) {
    const r = rows[Number(d.acq_date.slice(5, 7)) - 1];
    r[d.source]++;
    r.total++;
  }
  return rows;
}

/** Meteorological season, flipped for the southern hemisphere. */
export function seasonOf(d: FireDetection): Season {
  const m = Number(d.acq_date.slice(5, 7));
  const north: Season = m === 12 || m <= 2 ? "Winter" : m <= 5 ? "Spring" : m <= 8 ? "Summer" : "Autumn";
  if (REGION_BY_ID[d.regionId]?.hemisphere !== "S") return north;
  const flip: Record<Season, Season> = { Winter: "Summer", Summer: "Winter", Spring: "Autumn", Autumn: "Spring" };
  return flip[north];
}

export function bySeason(list: FireDetection[]) {
  const rows = SEASONS.map((s) => ({ season: s, count: 0, frpSum: 0 }));
  for (const d of list) {
    const r = rows[SEASONS.indexOf(seasonOf(d))];
    r.count++;
    r.frpSum += d.frp;
  }
  return rows.map((r) => ({ season: r.season, count: r.count, avgFrp: r.count ? +(r.frpSum / r.count).toFixed(1) : 0 }));
}

export interface RegionStat {
  regionId: string;
  name: string;
  country: string;
  count: number;
  share: number;
  avgFrp: number;
  maxFrp: number;
  highRiskShare: number;
  peakMonth: string;
}

export function byRegion(list: FireDetection[]): RegionStat[] {
  const acc = new Map<string, { count: number; frp: number; max: number; hi: number; months: number[] }>();
  for (const d of list) {
    const a = acc.get(d.regionId) ?? { count: 0, frp: 0, max: 0, hi: 0, months: new Array(12).fill(0) };
    a.count++;
    a.frp += d.frp;
    a.max = Math.max(a.max, d.frp);
    if (d.risk === "High" || d.risk === "Extreme") a.hi++;
    a.months[Number(d.acq_date.slice(5, 7)) - 1]++;
    acc.set(d.regionId, a);
  }
  const total = list.length || 1;
  return REGIONS.filter((r) => acc.has(r.id))
    .map((r) => {
      const a = acc.get(r.id)!;
      const peak = a.months.indexOf(Math.max(...a.months));
      return {
        regionId: r.id,
        name: r.name,
        country: r.country,
        count: a.count,
        share: a.count / total,
        avgFrp: a.frp / a.count,
        maxFrp: a.max,
        highRiskShare: a.hi / a.count,
        peakMonth: MONTH_LABELS[peak],
      };
    })
    .sort((a, b) => b.count - a.count);
}

export function byYear(list: FireDetection[]) {
  const years = new Map<string, { year: string; count: number; frp: number; MODIS: number; VIIRS: number }>();
  for (const d of list) {
    const y = d.acq_date.slice(0, 4);
    const r = years.get(y) ?? { year: y, count: 0, frp: 0, MODIS: 0, VIIRS: 0 };
    r.count++;
    r.frp += d.frp;
    r[d.source]++;
    years.set(y, r);
  }
  return [...years.values()]
    .sort((a, b) => a.year.localeCompare(b.year))
    .map((r) => ({ year: r.year, count: r.count, MODIS: r.MODIS, VIIRS: r.VIIRS, avgFrp: +(r.frp / r.count).toFixed(1) }));
}

/** Month × year matrix for overlaying years on a Jan–Dec axis. */
export function monthByYear(list: FireDetection[]) {
  const years = [...new Set(list.map((d) => d.acq_date.slice(0, 4)))].sort();
  const rows = MONTH_LABELS.map((m) => Object.fromEntries([["month", m], ...years.map((y) => [y, 0])]) as Record<string, string | number>);
  for (const d of list) {
    const r = rows[Number(d.acq_date.slice(5, 7)) - 1];
    const y = d.acq_date.slice(0, 4);
    r[y] = (r[y] as number) + 1;
  }
  return { years, rows };
}

export const FRP_BINS = [0, 5, 10, 20, 35, 50, 100, 200, 500, Infinity];

export function frpHistogram(list: FireDetection[]) {
  const rows = FRP_BINS.slice(0, -1).map((lo, i) => {
    const hi = FRP_BINS[i + 1];
    return { bin: hi === Infinity ? `${lo}+` : `${lo}–${hi}`, lo, hi, MODIS: 0, VIIRS: 0 };
  });
  for (const d of list) {
    const i = FRP_BINS.findIndex((b, idx) => d.frp >= b && d.frp < FRP_BINS[idx + 1]);
    if (i >= 0) rows[i][d.source]++;
  }
  return rows;
}

export function riskBreakdown(list: FireDetection[]) {
  const counts: Record<RiskLevel, number> = { Low: 0, Moderate: 0, High: 0, Extreme: 0 };
  for (const d of list) counts[d.risk]++;
  return RISK_LEVELS.map((r) => ({ risk: r, count: counts[r], share: list.length ? counts[r] / list.length : 0 }));
}

export function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = Math.min(sorted.length - 1, Math.max(0, Math.round(p * (sorted.length - 1))));
  return sorted[i];
}

export function frpSummary(list: FireDetection[]) {
  const v = list.map((d) => d.frp).sort((a, b) => a - b);
  return { median: percentile(v, 0.5), p90: percentile(v, 0.9), p99: percentile(v, 0.99), max: v[v.length - 1] ?? 0 };
}
