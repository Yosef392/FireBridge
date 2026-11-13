"use client";

import { fetchDetections, fetchPredictions } from "@/lib/api/client";
import { useFilters } from "@/context/filters";
import { useAsync } from "./use-async";

/** Detections for the current global filters (date preset, region, satellite source). */
export function useDetections() {
  const { filters } = useFilters();
  return useAsync((signal) => fetchDetections(filters, signal), [filters.preset, filters.regionId, filters.source]);
}

export function usePredictions() {
  return useAsync((signal) => fetchPredictions(signal), []);
}
