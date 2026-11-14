"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPinned, Satellite } from "lucide-react";
import { CellMap, MapLoading } from "@/components/map";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartCard, ErrorState, Notice, PageHeader } from "@/components/dashboard/primitives";
import type { Basemap, LiveHotspot, MapCell } from "@/components/map/cell-map";
import { AreaPanel } from "@/components/map/area-panel";
import { useAsync } from "@/hooks/use-async";
import { fetchCalendar, fetchCellIndex, fetchCellYear, fetchHarmonizedRegions, regionLabel, type AreaBox } from "@/lib/harmonized";
import { MONTHS_SHORT, RAMP_OPTIONS, rampGradient, setRampName, useRampName } from "@/lib/ramp";
import { fmtCompact, fmtInt } from "@/lib/utils";
import { CsvButton } from "@/components/dashboard/csv-button";
import { round, slug, toCsv } from "@/lib/csv";

const VIIRS_FROM = 2013;
type Metric = "harmonized" | "modis" | "viirs";

const METRIC_HELP: Record<Metric, string> = {
  harmonized: "The harmonized record on the VIIRS scale: real VIIRS from 2013, the model's estimate from MODIS before that.",
  modis: "Raw MODIS detections (Terra + Aqua, ~1 km pixels).",
  viirs: "Raw VIIRS detections (Suomi NPP, 375 m pixels). Only exists from 2012.",
};

export default function MapPage() {
  const regions = useAsync((s) => fetchHarmonizedRegions(s), []);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [pickedYear, setYear] = useState<number | null>(null);
  const [month, setMonth] = useState<string>("all");
  const [metric, setMetric] = useState<Metric>("harmonized");
  const [basemap, setBasemap] = useState<Basemap>("dark");
  const ramp = useRampName();
  const [area, setArea] = useState<AreaBox | null>(null);
  const [drawing, setDrawing] = useState(false);
  const [liveDays, setLiveDays] = useState<"0" | "1" | "7">("0");

  useEffect(() => {
    if (!regionId && regions.data?.length) {
      const wanted = new URLSearchParams(window.location.search).get("region");
      setRegionId(regions.data.find((r) => r.id === wanted)?.id ?? regions.data[0].id);
    }
  }, [regions.data, regionId]);

  const index = useAsync((s) => (regionId ? fetchCellIndex(regionId, s) : Promise.resolve(null)), [regionId]);
  // Years come from the region's own calendar (newest first): whatever the export covers, nothing hard-coded.
  const cal = useAsync((s) => (regionId ? fetchCalendar(regionId, s) : Promise.resolve(null)), [regionId]);
  const years = useMemo(
    () =>
      cal.data && cal.data.regionId === regionId
        ? [...new Set(cal.data.months.filter((m) => m.calendar != null).map((m) => Number(m.month.slice(0, 4))))].sort((a, b) => b - a)
        : [],
    [cal.data, regionId],
  );
  const year = pickedYear != null && years.includes(pickedYear) ? pickedYear : (years[0] ?? 0);
  const cellYear = useAsync(
    (s) => (regionId && year ? fetchCellYear(regionId, year, s) : Promise.resolve(null)),
    [regionId, year],
  );
  const region = regions.data?.find((r) => r.id === regionId) ?? null;
  useEffect(() => {
    // A drawn area belongs to one region's grid.
    setArea(null);
    setDrawing(false);
  }, [regionId]);

  /* ---- live FIRMS hotspots (last 24 h / 7 days), via our server route so the MAP_KEY stays private */
  const live = useAsync(
    async (signal) => {
      if (liveDays === "0" || !region) return null;
      const [latMin, latMax, lonMin, lonMax] = region.bbox;
      const res = await fetch(`/api/hotspots?bbox=${lonMin},${latMin},${lonMax},${latMax}&days=${liveDays}`, { signal });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error ?? `Live hotspots failed (${res.status}).`);
      return body as { hotspots: LiveHotspot[]; fetchedAt: string; failed: string[] };
    },
    [liveDays, region?.id],
  );
  const liveRegion = live.data && liveDays !== "0" ? live.data : null;

  const metricShown: Metric = metric === "viirs" && year < 2012 ? "harmonized" : metric;

  const view = useMemo(() => {
    if (!index.data || !cellYear.data || index.data.regionId !== regionId || cellYear.data.regionId !== regionId || cellYear.data.year !== year)
      return null;
    const sums = new Map<number, number>();
    const monthsUsed = month === "all" ? Object.keys(cellYear.data.months) : [month];
    for (const mo of monthsUsed) {
      for (const [c, h, m, v] of cellYear.data.months[mo] ?? []) {
        const val = metricShown === "modis" ? m : metricShown === "viirs" || year >= VIIRS_FROM ? (v ?? 0) : h;
        if (val > 0) sums.set(c, (sums.get(c) ?? 0) + val);
      }
    }
    const cells: MapCell[] = [];
    /** Every cell with activity (including the sub-1 model estimates hidden on the map), for the CSV. */
    const exportRows: { cell: number; bounds: [number, number, number, number]; value: number }[] = [];
    let total = 0;
    let max = 0;
    for (const [c, value] of sums) {
      const b = index.data.cells[c];
      if (!b) continue;
      total += value;
      exportRows.push({ cell: c, bounds: b, value });
      // Model estimates spread tiny fractions over many cells; only draw cells worth about one detection.
      if (value < 0.5) continue;
      max = Math.max(max, value);
      cells.push({ bounds: b, value, label: `${((b[0] + b[2]) / 2).toFixed(2)}°, ${((b[1] + b[3]) / 2).toFixed(2)}°` });
    }
    cells.sort((a, b) => a.value - b.value);
    const top = [...cells].reverse().slice(0, 6);
    exportRows.sort((a, b) => b.value - a.value);
    return { cells, exportRows, total, max, top, cellCount: index.data.cells.length, gridKm: index.data.gridKm };
  }, [index.data, cellYear.data, regionId, month, metricShown, year]);

  const error = regions.error ?? cal.error ?? index.error ?? cellYear.error;
  const period = month === "all" ? String(year) : `${MONTHS_SHORT[Number(month) - 1]} ${year}`;
  const modelled = metricShown === "harmonized" && year < VIIRS_FROM;

  const recordLabel = metricShown === "modis" ? "MODIS" : metricShown === "viirs" || year >= VIIRS_FROM ? "VIIRS" : "model";
  const cellsCsv =
    view && region
      ? () => ({
          filename: `firebridge_${slug(region.id)}_cells_${year}${month === "all" ? "" : `-${month}`}_${metricShown}.csv`,
          csv: toCsv(
            [
              { header: "region_id", value: () => region.id },
              { header: "period", value: () => (month === "all" ? String(year) : `${year}-${month}`) },
              { header: "record", value: () => metricShown },
              { header: "record_source", value: () => recordLabel },
              { header: "cell_id", value: (r) => r.cell },
              { header: "lat_center", value: (r) => round((r.bounds[0] + r.bounds[2]) / 2, 4) },
              { header: "lon_center", value: (r) => round((r.bounds[1] + r.bounds[3]) / 2, 4) },
              { header: "lat_min", value: (r) => round(r.bounds[0], 4) },
              { header: "lon_min", value: (r) => round(r.bounds[1], 4) },
              { header: "lat_max", value: (r) => round(r.bounds[2], 4) },
              { header: "lon_max", value: (r) => round(r.bounds[3], 4) },
              { header: "hotspots", value: (r) => round(r.value, 2) },
            ],
            view.exportRows,
          ),
        })
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fire Map"
        title="Where the fires were"
        description="Fire detections per 10 km grid cell inside each study region, from NASA FIRMS. Pick a region, a year and optionally one month; hover a cell for its count."
        actions={
          <>
            <Badge variant="success">
              <Satellite className="size-3" aria-hidden /> NASA FIRMS data
            </Badge>
            <label className="block w-64">
              <span className="sr-only">Study region</span>
              <Select value={regionId ?? ""} onValueChange={setRegionId}>
                <SelectTrigger aria-label="Study region">
                  <span className="flex items-center gap-2 truncate">
                    <MapPinned className="size-4 shrink-0 text-accent" aria-hidden />
                    <SelectValue placeholder="Loading regions…" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(regions.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {regionLabel(r)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        <label className="w-32">
          <span className="sr-only">Year</span>
          <Select value={year ? String(year) : ""} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger aria-label="Year">
              <span className="flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" aria-hidden />
                <SelectValue />
              </span>
            </SelectTrigger>
            <SelectContent>
              {years.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="w-36">
          <span className="sr-only">Month</span>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger aria-label="Month">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Whole year</SelectItem>
              {Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0")).map((m) => (
                <SelectItem key={m} value={m}>
                  {MONTHS_SHORT[Number(m) - 1]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <Segmented
          ariaLabel="Record"
          value={metric}
          onChange={setMetric}
          options={[
            { value: "harmonized", label: "Harmonized" },
            { value: "modis", label: "MODIS" },
            { value: "viirs", label: "VIIRS" },
          ]}
        />
        <Segmented ariaLabel="Colour scale" value={ramp} onChange={setRampName} options={RAMP_OPTIONS} />
        <Segmented
          ariaLabel="Live FIRMS hotspots"
          value={liveDays}
          onChange={setLiveDays}
          options={[
            { value: "0", label: "Live off" },
            { value: "1", label: "Live 24 h" },
            { value: "7", label: "Live 7 d" },
          ]}
        />
        <Segmented
          ariaLabel="Basemap"
          className="ml-auto"
          value={basemap}
          onChange={setBasemap}
          options={[
            { value: "dark", label: "Dark" },
            { value: "satellite", label: "Satellite" },
          ]}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
        <Card className="overflow-hidden p-2 xl:col-span-3">
          {error ? (
            <ErrorState error={error} onRetry={() => (regions.retry(), index.retry(), cellYear.retry())} height={560} />
          ) : !view || !region ? (
            <MapLoading height="min(68vh, 640px)" />
          ) : (
            <CellMap
              cells={view.cells}
              max={view.max}
              bbox={region.bbox}
              basemap={basemap}
              height="min(68vh, 640px)"
              ramp={ramp}
              area={area}
              drawing={drawing}
              onAreaDrawn={(box) => {
                setArea(box);
                setDrawing(false);
              }}
              live={liveRegion?.hotspots ?? []}
            />
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 pb-2 pt-3 text-[11px] text-muted">
            <span className="flex items-center gap-2">
              1
              <span className="h-2 w-40 rounded-full" style={{ background: rampGradient(ramp, 1) }} aria-hidden />
              {view ? fmtCompact(view.max) : "—"} detections per cell (log scale)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-5 border-t border-dashed border-white/60" aria-hidden /> Study region
            </span>
            {area && (
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-5 border-t-2 border-[#2fd3a4]" aria-hidden /> Your area
              </span>
            )}
            {liveDays !== "0" && (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-white bg-[#ff3b30]" aria-hidden />
                {live.status === "loading"
                  ? "Loading live hotspots…"
                  : liveRegion
                    ? `${fmtInt(liveRegion.hotspots.length)} live VIIRS hotspots, last ${liveDays === "1" ? "24 h" : "7 days"} (NRT, fetched ${liveRegion.fetchedAt.slice(11, 16)} UTC)`
                    : "Live hotspots unavailable"}
              </span>
            )}
          </div>
          {liveDays !== "0" && live.error && (
            <p className="px-3 pb-2 text-[11px] text-fire-soft" role="status">
              {live.error.message}
            </p>
          )}
        </Card>

        <div className="space-y-6">
          <ChartCard
            title={period}
            description={METRIC_HELP[metricShown]}
            actions={<CsvButton title={`hotspots per 10 km cell, ${period}`} build={cellsCsv} />}
          >
            <dl className="space-y-3 text-xs">
              <div className="flex justify-between">
                <dt className="text-muted">Detections</dt>
                <dd className="font-mono tabular-nums">{view ? fmtInt(view.total) : "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Cells with fire</dt>
                <dd className="font-mono tabular-nums">
                  {view ? `${fmtInt(view.cells.length)} of ${fmtInt(view.cellCount)}` : "—"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-muted">Cell size</dt>
                <dd className="font-mono tabular-nums">{view ? `${view.gridKm} × ${view.gridKm} km` : "—"}</dd>
              </div>
            </dl>
            {metric === "viirs" && year < 2012 && (
              <p className="mt-3 text-[11px] text-subtle">VIIRS didn’t exist yet in {year}, so the harmonized record is shown.</p>
            )}
          </ChartCard>

          <ChartCard title="Busiest cells" description="Cell centre and detection count">
            {view && view.top.length ? (
              <ol className="space-y-2 text-xs">
                {view.top.map((c, i) => (
                  <li key={i} className="flex justify-between gap-3">
                    <span className="font-mono text-muted">{c.label}</span>
                    <span className="font-mono tabular-nums">{fmtInt(c.value)}</span>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-xs text-muted">{view ? "No fire detections in this period." : "Loading…"}</p>
            )}
          </ChartCard>

          {modelled && (
            <Notice tone="info">
              {year} is before VIIRS, so each cell shows the model's estimate of what VIIRS would have counted there, built from MODIS.
              Values below 1 are hidden, and cell-level estimates are less certain than the regional totals.
            </Notice>
          )}
        </div>
      </div>

      {region && (
        <AreaPanel
          region={region}
          index={index.data && index.data.regionId === region.id ? index.data : null}
          viirsFrom={VIIRS_FROM}
          years={years}
          area={area}
          onArea={setArea}
          drawing={drawing}
          onDrawing={setDrawing}
        />
      )}
    </div>
  );
}
