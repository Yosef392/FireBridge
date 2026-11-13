import type { DatePreset, DateRange } from "./types";
import { DEMO_END, DEMO_START } from "@/data/demo/meta";

export const DATE_PRESETS: { value: DatePreset; label: string }[] = [
  { value: "30d", label: "Last 30 days" },
  { value: "90d", label: "Last 90 days" },
  { value: "12m", label: "Last 12 months" },
  { value: "2024", label: "Year 2024" },
  { value: "2023", label: "Year 2023" },
  { value: "2022", label: "Year 2022" },
  { value: "all", label: "Full archive (2020–2024)" },
];

const DAY = 86_400_000;
export const toISO = (t: number) => new Date(t).toISOString().slice(0, 10);
export const parseISO = (s: string) => Date.parse(`${s}T00:00:00Z`);

/** "Today" for the archive is its last day: the demo dataset is historical, not live. */
export function resolveRange(preset: DatePreset, archiveEnd = DEMO_END, archiveStart = DEMO_START): DateRange {
  const end = parseISO(archiveEnd);
  switch (preset) {
    case "30d":
      return { start: toISO(end - 29 * DAY), end: archiveEnd };
    case "90d":
      return { start: toISO(end - 89 * DAY), end: archiveEnd };
    case "12m":
      return { start: toISO(end - 365 * DAY), end: archiveEnd };
    case "2024":
    case "2023":
    case "2022":
      return { start: `${preset}-01-01`, end: `${preset}-12-31` };
    default:
      return { start: archiveStart, end: archiveEnd };
  }
}

export function previousRange(r: DateRange): DateRange {
  const s = parseISO(r.start);
  const e = parseISO(r.end);
  const len = e - s + DAY;
  return { start: toISO(s - len), end: toISO(s - DAY) };
}

export function daysIn(r: DateRange) {
  return Math.round((parseISO(r.end) - parseISO(r.start)) / DAY) + 1;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export const MONTH_LABELS = MONTHS;

export function formatDate(iso: string, opts: { year?: boolean } = { year: true }) {
  const [y, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}${opts.year ? `, ${y}` : ""}`;
}

export function formatRange(r: DateRange) {
  return `${formatDate(r.start)} – ${formatDate(r.end)}`;
}
