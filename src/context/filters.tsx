"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { DetectionFilters } from "@/lib/types";

interface FilterCtx {
  filters: DetectionFilters;
  setFilter: <K extends keyof DetectionFilters>(key: K, value: DetectionFilters[K]) => void;
  reset: () => void;
}

export const DEFAULT_FILTERS: DetectionFilters = { preset: "12m", regionId: "ALL", source: "ALL" };

const Ctx = createContext<FilterCtx | null>(null);

/** Global dashboard filters: shared by the top bar and every dashboard page. */
export function FilterProvider({ children }: { children: React.ReactNode }) {
  const [filters, setFilters] = useState<DetectionFilters>(DEFAULT_FILTERS);
  const setFilter = useCallback<FilterCtx["setFilter"]>((key, value) => setFilters((f) => ({ ...f, [key]: value })), []);
  const reset = useCallback(() => setFilters(DEFAULT_FILTERS), []);
  const value = useMemo(() => ({ filters, setFilter, reset }), [filters, setFilter, reset]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useFilters() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useFilters must be used inside <FilterProvider>");
  return ctx;
}
