import type { Confidence, FireDetection, SatelliteSource } from "@/lib/types";
import { REGION_PROFILES } from "./regions";
import { riskFromFrp } from "@/lib/risk";
import { geoContains } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";

/**
 * DEMO DATA — Deterministic generator for an illustrative wildfire detection archive.
 *
 * The output imitates the *shape* of NASA FIRMS MODIS/VIIRS active-fire records
 * (seasonality, regional clustering, FRP distributions, sensor mix), but every
 * record is synthetic. Nothing here is a real satellite observation.
 */

export { DEMO_START, DEMO_END } from "./meta";
const VOLUME_SCALE = 0.5;

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number) {
  const u = Math.max(rand(), 1e-9);
  const v = rand();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function poisson(rand: () => number, lambda: number) {
  if (lambda <= 0) return 0;
  if (lambda > 30) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussian(rand)));
  const L = Math.exp(-lambda);
  let k = 0;
  let p = 1;
  do {
    k++;
    p *= rand();
  } while (p > L);
  return k - 1;
}

/** Cyclic distance between two months (1..12, fractional). */
function monthDistance(a: number, b: number) {
  const d = Math.abs(a - b) % 12;
  return Math.min(d, 12 - d);
}

export { riskFromFrp };

const pad = (n: number) => String(n).padStart(2, "0");

function makeLandTest() {
  const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
  const land = feature(topo, topo.objects.land);
  // Memoise on a 0.1° grid: clustered points hit the same cells, keeping this fast.
  const cache = new Map<number, boolean>();
  return (lat: number, lon: number) => {
    const key = Math.round(lat * 10) * 4000 + Math.round(lon * 10);
    let v = cache.get(key);
    if (v === undefined) {
      v = geoContains(land, [Math.round(lon * 10) / 10, Math.round(lat * 10) / 10]);
      cache.set(key, v);
    }
    return v;
  };
}

function generate(): FireDetection[] {
  const onLand = makeLandTest();
  const rand = mulberry32(20241031);
  const out: FireDetection[] = [];
  const start = Date.UTC(2020, 0, 1);
  const end = Date.UTC(2024, 11, 31);
  const DAY = 86_400_000;
  let seq = 0;

  for (let t = start; t <= end; t += DAY) {
    const date = new Date(t);
    const year = date.getUTCFullYear();
    const month = date.getUTCMonth() + 1 + (date.getUTCDate() - 1) / 31;
    const iso = `${year}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())}`;

    for (const p of REGION_PROFILES) {
      const d = monthDistance(month, p.peakMonth);
      const seasonal = Math.max(p.floor, Math.exp(-(d * d) / (2 * p.width * p.width)));
      // Multi-day "fire event" noise so the series has bursts, not just smooth curves.
      const burst = Math.exp(0.55 * gaussian(rand));
      const lambda = p.peakRate * VOLUME_SCALE * seasonal * p.years[year - 2020] * burst;
      const count = poisson(rand, lambda);

      for (let i = 0; i < count; i++) {
        const [clat, clon, spread] = p.clusters[Math.floor(rand() * p.clusters.length)];
        // Rejection-sample a location on land (simulated fires should not appear at sea).
        let lat = clat;
        let lon = clon;
        for (let tries = 0; tries < 8; tries++) {
          const la = clat + gaussian(rand) * spread * 0.55;
          const lo = clon + gaussian(rand) * spread * 0.7;
          if (onLand(la, lo)) {
            lat = la;
            lon = lo;
            break;
          }
        }
        const source: SatelliteSource = rand() < 0.36 ? "MODIS" : "VIIRS";
        const satellite =
          source === "MODIS" ? (rand() < 0.5 ? "Terra" : "Aqua") : rand() < 0.5 ? "Suomi NPP" : "NOAA-20";
        // VIIRS 375 m pixels resolve smaller fires -> lower per-pixel FRP.
        const median = (source === "MODIS" ? 22 : 7.5) * p.intensity * (0.75 + seasonal * 0.6);
        const frp = Math.min(2400, Math.max(0.6, median * Math.exp(0.95 * gaussian(rand))));
        const daynight = rand() < 0.72 ? "D" : "N";
        const hour = daynight === "D" ? 9 + Math.floor(rand() * 7) : 20 + Math.floor(rand() * 7);
        const cRoll = rand() + Math.min(frp / 200, 0.25);
        const confidence: Confidence = cRoll > 0.82 ? "high" : cRoll > 0.18 ? "nominal" : "low";

        out.push({
          id: `D${(seq++).toString(36).toUpperCase().padStart(6, "0")}`,
          latitude: +lat.toFixed(4),
          longitude: +lon.toFixed(4),
          acq_date: iso,
          acq_time: `${pad(hour % 24)}${pad(Math.floor(rand() * 60))}`,
          source,
          satellite,
          frp: +frp.toFixed(1),
          brightness: +(305 + Math.min(110, Math.log1p(frp) * 16) + gaussian(rand) * 4).toFixed(1),
          confidence,
          daynight,
          regionId: p.id,
          risk: riskFromFrp(frp),
        });
      }
    }
  }
  return out;
}

let cache: FireDetection[] | null = null;

/** Lazily generated, memoised illustrative archive (sorted by date ascending). */
export function getDemoDetections(): FireDetection[] {
  if (!cache) cache = generate();
  return cache;
}
