"use client";

import { useAsync } from "@/hooks/use-async";
import { fetchCoverage, type Coverage } from "@/lib/harmonized";

/** The dataset's real coverage (regions, months, test years), or null while it loads. */
export function useCoverage(): Coverage | null {
  return useAsync((s) => fetchCoverage(s), []).data;
}
