"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

function MapLoading({ height = 560 }: { height?: number | string }) {
  return (
    <div className="relative overflow-hidden rounded-xl" style={{ height }} role="status" aria-label="Loading map">
      <Skeleton className="absolute inset-0 rounded-xl" />
      <div className="absolute inset-0 flex items-center justify-center text-xs text-muted">Initialising map…</div>
    </div>
  );
}

/** Leaflet touches `window`, so maps are client-only. */
export const FireMap = dynamic(() => import("./leaflet-map"), { ssr: false, loading: () => <MapLoading /> });
export const PredictionMap = dynamic(() => import("./leaflet-map").then((m) => m.LeafletPredictionMap), {
  ssr: false,
  loading: () => <MapLoading height={420} />,
});

export { MapLoading };
