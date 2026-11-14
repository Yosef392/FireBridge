"use client";

import { useAsync } from "@/hooks/use-async";
import { useCoverage } from "@/hooks/use-coverage";
import { fetchHarmonizedRegions, fmtMonth } from "@/lib/harmonized";

/**
 * Inline text about what the data covers, read from the exported files, for server-rendered pages
 * (About) that can't call hooks themselves. Shows `fallback` until the files have loaded.
 */
export function CoverageText({
  field,
  fallback = "…",
}: {
  field: "overlap" | "train" | "test" | "record" | "regions";
  fallback?: string;
}) {
  const c = useCoverage();
  if (!c) return <>{fallback}</>;
  switch (field) {
    case "overlap": // years where both sensors exist
      return <>{`${c.viirsFrom}–${c.testTo}`}</>;
    case "train":
      return <>{c.trainUntil ? `${c.viirsFrom}–${c.trainUntil}, tuned on ${c.valYears.join(", ")}` : fallback}</>;
    case "test":
      return <>{c.testFrom ? `${c.testFrom}–${c.testTo}` : fallback}</>;
    case "record":
      return <>{`${fmtMonth(c.firstMonth)} – ${fmtMonth(c.lastMonth)}`}</>;
    case "regions":
      return <>{c.regionCount}</>;
  }
}

/** "8 study regions, 8 fire types" from regions.json. */
export function RegionSummary() {
  const regions = useAsync((s) => fetchHarmonizedRegions(s), []).data;
  if (!regions) return <>Study regions with different fire types</>;
  const types = new Set(regions.map((r) => r.fireType)).size;
  return <>{`${regions.length} study regions, ${types} fire types`}</>;
}
