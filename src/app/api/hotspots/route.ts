import { NextResponse, type NextRequest } from "next/server";

/**
 * Live FIRMS hotspots for the map: GET /api/hotspots?bbox=west,south,east,north&days=1..10
 *
 * Proxies the FIRMS Area API (https://firms.modaps.eosdis.nasa.gov/api/area/) so the MAP_KEY stays on
 * the server. Merges the three VIIRS near-real-time products (Suomi NPP, NOAA-20, NOAA-21) and caches
 * each FIRMS response for 15 minutes, well inside FIRMS' 5,000-requests-per-10-minutes limit.
 *
 * Set FIRMS_MAP_KEY in .env.local (free key: https://firms.modaps.eosdis.nasa.gov/api/map_key/).
 */

const SOURCES = ["VIIRS_SNPP_NRT", "VIIRS_NOAA20_NRT", "VIIRS_NOAA21_NRT"] as const;
const SATELLITE: Record<(typeof SOURCES)[number], string> = {
  VIIRS_SNPP_NRT: "Suomi NPP",
  VIIRS_NOAA20_NRT: "NOAA-20",
  VIIRS_NOAA21_NRT: "NOAA-21",
};
const REVALIDATE_S = 900;
/** FIRMS Area API limit per call (it was 10 days; FIRMS now answers "Expects [1..5]"). */
const MAX_DAYS_PER_CALL = 5;
const DAY_MS = 86_400_000;
/** Larger boxes would return too many points to draw; the study regions are all well below this. */
const MAX_AREA_DEG2 = 400;

export interface LiveHotspot {
  lat: number;
  lon: number;
  /** YYYY-MM-DD */
  date: string;
  /** HHMM UTC */
  time: string;
  frp: number | null;
  /** FIRMS VIIRS confidence: l / n / h */
  confidence: string;
  daynight: string;
  satellite: string;
}

function parseCsv(text: string, satellite: string): LiveHotspot[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const head = lines[0].split(",");
  const col = (name: string) => head.indexOf(name);
  const iLat = col("latitude");
  const iLon = col("longitude");
  const iDate = col("acq_date");
  const iTime = col("acq_time");
  const iFrp = col("frp");
  const iConf = col("confidence");
  const iDn = col("daynight");
  if (iLat < 0 || iLon < 0) return [];
  return lines.slice(1).map((l) => {
    const c = l.split(",");
    const frp = Number(c[iFrp]);
    return {
      lat: Number(c[iLat]),
      lon: Number(c[iLon]),
      date: c[iDate] ?? "",
      time: String(c[iTime] ?? "").padStart(4, "0"),
      frp: Number.isFinite(frp) ? frp : null,
      confidence: c[iConf] ?? "",
      daynight: c[iDn] ?? "",
      satellite,
    };
  });
}

export async function GET(req: NextRequest) {
  const key = process.env.FIRMS_MAP_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "Live hotspots are off: set FIRMS_MAP_KEY in .env.local (free key from firms.modaps.eosdis.nasa.gov/api/map_key)." },
      { status: 503 },
    );
  }

  const params = req.nextUrl.searchParams;
  const bbox = (params.get("bbox") ?? "").split(",").map(Number);
  const days = Math.round(Number(params.get("days") ?? "1"));
  const [w, s, e, n] = bbox;
  const valid =
    bbox.length === 4 &&
    bbox.every(Number.isFinite) &&
    w >= -180 && e <= 180 && s >= -90 && n <= 90 && w < e && s < n;
  if (!valid) return NextResponse.json({ error: "bbox must be west,south,east,north in degrees." }, { status: 400 });
  if ((e - w) * (n - s) > MAX_AREA_DEG2) return NextResponse.json({ error: "Area too large for live hotspots." }, { status: 400 });
  if (!(days >= 1 && days <= 10)) return NextResponse.json({ error: "days must be 1–10." }, { status: 400 });

  // FIRMS answers at most MAX_DAYS_PER_CALL days per request ("Invalid day range. Expects [1..5]"),
  // so longer windows are split into dated calls: e.g. 7 days = 5 days from 6 days ago + the last 2.
  const today = Date.UTC(new Date().getUTCFullYear(), new Date().getUTCMonth(), new Date().getUTCDate());
  const windows: { start: string; n: number }[] = [];
  for (let left = days, start = today - (days - 1) * DAY_MS; left > 0; ) {
    const n = Math.min(MAX_DAYS_PER_CALL, left);
    windows.push({ start: new Date(start).toISOString().slice(0, 10), n });
    start += n * DAY_MS;
    left -= n;
  }

  const area = [w, s, e, n].map((v) => v.toFixed(4)).join(",");
  const results = await Promise.allSettled(
    SOURCES.map(async (src) => {
      const parts = await Promise.all(
        windows.map(async ({ start, n }) => {
          const url = `https://firms.modaps.eosdis.nasa.gov/api/area/csv/${key}/${src}/${area}/${n}/${start}`;
          const res = await fetch(url, { next: { revalidate: REVALIDATE_S } });
          const text = await res.text();
          // FIRMS answers errors (bad key, limit reached, bad range) with HTTP 200 and a plain-text message.
          if (!res.ok || !text.startsWith("latitude")) throw new Error(`${src}: ${text.slice(0, 120)}`);
          return parseCsv(text, SATELLITE[src]);
        }),
      );
      return parts.flat();
    }),
  );

  const hotspots = results.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
  const failed = results.flatMap((r, i) => (r.status === "rejected" ? [SOURCES[i]] : []));
  if (failed.length === SOURCES.length) {
    const reason = results[0].status === "rejected" ? String(results[0].reason?.message ?? "") : "";
    return NextResponse.json({ error: `FIRMS request failed. ${reason}` }, { status: 502 });
  }

  hotspots.sort((a, b) => (a.date + a.time).localeCompare(b.date + b.time));
  return NextResponse.json(
    { hotspots, days, sources: SOURCES.filter((s) => !failed.includes(s)), failed, fetchedAt: new Date().toISOString() },
    { headers: { "Cache-Control": `public, s-maxage=${REVALIDATE_S}, stale-while-revalidate=${REVALIDATE_S}` } },
  );
}
