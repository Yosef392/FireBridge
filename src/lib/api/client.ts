import type {
  DetectionFilters,
  DetectionResponse,
  FireDetection,
  PredictionResponse,
  Region,
} from "@/lib/types";
import { API_BASE_URL, DATA_MODE } from "./config";
import { previousRange, resolveRange } from "@/lib/dates";

/**
 * Single entry point for all data the UI consumes.
 * Components never import demo data directly — they call these functions, so
 * switching NEXT_PUBLIC_DATA_MODE to "api" points the whole app at FastAPI.
 */

export class ApiError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "ApiError";
  }
}

async function getJSON<T>(path: string, signal?: AbortSignal): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE_URL}${path}`, { signal, headers: { Accept: "application/json" } });
  } catch (e) {
    if ((e as Error).name === "AbortError") throw e;
    throw new ApiError(`Could not reach the analysis backend at ${API_BASE_URL}.`);
  }
  if (!res.ok) throw new ApiError(`Backend responded with ${res.status} for ${path}`, res.status);
  return res.json() as Promise<T>;
}

/** Small artificial latency in demo mode so loading states are visible and realistic. */
const simulateLatency = (ms: number, signal?: AbortSignal) =>
  new Promise<void>((resolve, reject) => {
    const t = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(t);
      reject(new DOMException("Aborted", "AbortError"));
    });
  });

function inRange(d: FireDetection, start: string, end: string) {
  return d.acq_date >= start && d.acq_date <= end;
}

export async function fetchRegions(signal?: AbortSignal): Promise<Region[]> {
  if (DATA_MODE === "api") return getJSON<Region[]>("/api/v1/regions", signal);
  const { REGIONS } = await import("@/data/demo/regions");
  return REGIONS;
}

export async function fetchDetections(filters: DetectionFilters, signal?: AbortSignal): Promise<DetectionResponse> {
  const range = resolveRange(filters.preset);
  if (DATA_MODE === "api") {
    const q = new URLSearchParams({ preset: filters.preset, region: filters.regionId, source: filters.source });
    return getJSON<DetectionResponse>(`/api/v1/detections?${q}`, signal);
  }

  await simulateLatency(350, signal);
  const { getDemoDetections } = await import("@/data/demo/detections");
  const all = getDemoDetections();
  const prev = previousRange(range);
  const match = (d: FireDetection) =>
    (filters.regionId === "ALL" || d.regionId === filters.regionId) &&
    (filters.source === "ALL" || d.source === filters.source);

  const detections: FireDetection[] = [];
  const previous: FireDetection[] = [];
  for (const d of all) {
    if (!match(d)) continue;
    if (inRange(d, range.start, range.end)) detections.push(d);
    else if (inRange(d, prev.start, prev.end)) previous.push(d);
  }
  return { range, detections, previous, isDemo: true };
}

export async function fetchPredictions(signal?: AbortSignal): Promise<PredictionResponse> {
  if (DATA_MODE === "api") return getJSON<PredictionResponse>("/api/v1/predictions", signal);
  await simulateLatency(450, signal);
  const mod = await import("@/data/demo/predictions");
  return {
    model: mod.DEMO_MODEL,
    predictions: mod.getDemoPredictions(),
    featureImportance: mod.DEMO_FEATURE_IMPORTANCE,
    isDemo: true,
  };
}
