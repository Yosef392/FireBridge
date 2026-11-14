"use client";

import { CalendarRange, Globe2, Menu, RotateCcw, Satellite } from "lucide-react";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DemoBadge } from "@/components/dashboard/primitives";
import { DEFAULT_FILTERS, useFilters } from "@/context/filters";
import { DATE_PRESETS, formatRange, resolveRange } from "@/lib/dates";
import { REGIONS } from "@/data/demo/regions";
import { IS_DEMO } from "@/lib/api/config";
import type { DatePreset, SourceFilter } from "@/lib/types";
import { LogoMark } from "./logo";
import { useIsRealDataPage } from "./data-source";
import { useCoverage } from "@/hooks/use-coverage";
import { fmtMonth } from "@/lib/harmonized";

const CONTINENTS = [...new Set(REGIONS.map((r) => r.continent))];

export function Topbar({ onMenu }: { onMenu: () => void }) {
  const { filters, setFilter, reset } = useFilters();
  const real = useIsRealDataPage();
  const cov = useCoverage();
  const demo = IS_DEMO && !real;
  const range = resolveRange(filters.preset);
  const dirty =
    filters.preset !== DEFAULT_FILTERS.preset || filters.regionId !== DEFAULT_FILTERS.regionId || filters.source !== DEFAULT_FILTERS.source;

  return (
    <header className="relative z-[900] border-b lg:sticky lg:top-0 border-border bg-background/85 backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-2 px-4 py-3 md:px-6 lg:px-8">
        <button onClick={onMenu} className="rounded-lg p-2 text-muted hover:bg-surface-2 hover:text-foreground lg:hidden" aria-label="Open navigation">
          <Menu className="size-5" />
        </button>
        <LogoMark className="size-7 lg:hidden" />

        {real ? (
          <p className="text-xs text-muted">
            NASA FIRMS MODIS + VIIRS{cov ? ` · ${cov.regionCount} study regions · ${fmtMonth(cov.firstMonth)} – ${fmtMonth(cov.lastMonth)}` : ""}
          </p>
        ) : (
        <div className="order-last grid w-full grid-cols-1 gap-2 sm:grid-cols-3 lg:order-none lg:flex lg:w-auto lg:flex-1 lg:items-center">
          <label className="relative block lg:w-56">
            <span className="sr-only">Date range</span>
            <Select value={filters.preset} onValueChange={(v) => setFilter("preset", v as DatePreset)}>
              <SelectTrigger aria-label="Date range">
                <span className="flex items-center gap-2 truncate">
                  <CalendarRange className="size-4 shrink-0 text-primary" aria-hidden />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                {DATE_PRESETS.map((p) => (
                  <SelectItem key={p.value} value={p.value}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block lg:w-60">
            <span className="sr-only">Geographic region</span>
            <Select value={filters.regionId} onValueChange={(v) => setFilter("regionId", v)}>
              <SelectTrigger aria-label="Geographic region">
                <span className="flex items-center gap-2 truncate">
                  <Globe2 className="size-4 shrink-0 text-accent" aria-hidden />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All monitored regions</SelectItem>
                {CONTINENTS.map((c) => (
                  <SelectGroup key={c}>
                    <SelectLabel>{c}</SelectLabel>
                    {REGIONS.filter((r) => r.continent === c).map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}, {r.country}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                ))}
              </SelectContent>
            </Select>
          </label>

          <label className="block lg:w-48">
            <span className="sr-only">Satellite source</span>
            <Select value={filters.source} onValueChange={(v) => setFilter("source", v as SourceFilter)}>
              <SelectTrigger aria-label="Satellite source">
                <span className="flex items-center gap-2 truncate">
                  <Satellite className="size-4 shrink-0 text-fire-soft" aria-hidden />
                  <SelectValue />
                </span>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">MODIS + VIIRS</SelectItem>
                <SelectItem value="MODIS">MODIS (Terra/Aqua)</SelectItem>
                <SelectItem value="VIIRS">VIIRS (S-NPP/NOAA-20)</SelectItem>
              </SelectContent>
            </Select>
          </label>

          {dirty && (
            <button
              onClick={reset}
              className="hidden items-center gap-1.5 rounded-lg px-2 py-2 text-xs text-muted hover:text-foreground lg:inline-flex"
            >
              <RotateCcw className="size-3.5" aria-hidden /> Reset
            </button>
          )}
        </div>
        )}

        <div className="ml-auto flex items-center gap-3">
          {!real && (
          <div className="hidden text-right xl:block">
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">Window</p>
            <p className="text-xs tabular-nums text-muted">{formatRange(range)}</p>
          </div>
          )}
          <div className="flex items-center gap-2 rounded-lg border border-border bg-surface/70 px-2.5 py-1.5">
            <span className="relative flex size-2">
              <span className={`absolute inline-flex size-full rounded-full ${demo ? "bg-fire-soft" : "bg-success"} animate-pulse-ring`} />
              <span className={`relative inline-flex size-2 rounded-full ${demo ? "bg-fire-soft" : "bg-success"}`} />
            </span>
            <span className="hidden text-[11px] text-muted sm:inline">Source:</span>
            <span className="text-[11px] font-medium">{real ? "NASA FIRMS (exported results)" : IS_DEMO ? "Illustrative archive" : "FastAPI backend"}</span>
            {demo && <DemoBadge className="hidden sm:inline-flex" />}
          </div>
        </div>
      </div>
    </header>
  );
}
