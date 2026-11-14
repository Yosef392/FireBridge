"use client";

import { useEffect, useMemo, useState } from "react";
import { CalendarDays, MapPinned, Satellite } from "lucide-react";
import { CellMap, MapLoading } from "@/components/map";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartCard, ErrorState, Notice, PageHeader } from "@/components/dashboard/primitives";
import type { Basemap, DrawTool, LiveHotspot, MapCell } from "@/components/map/cell-map";
import { AreaPanel, type AreaPart } from "@/components/map/area-panel";
import { useAsync } from "@/hooks/use-async";
import {
  cellsInShape,
  fetchCalendar,
  fetchCellIndex,
  fetchCellYear,
  fetchHarmonizedRegions,
  regionLabel,
  shapeFromParam,
  shapeToParam,
  type AreaShape,
} from "@/lib/harmonized";
import { MONTHS_SHORT, RAMP_OPTIONS, rampGradient, setRampName, useRampName } from "@/lib/ramp";
import { fmtCompact, fmtInt } from "@/lib/utils";
import { CsvButton } from "@/components/dashboard/csv-button";
import { round, slug, toCsv } from "@/lib/csv";

const VIIRS_FROM = 2013;
const ALL = "ALL";
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
  const [area, setArea] = useState<AreaShape | null>(null);
  const [tool, setTool] = useState<DrawTool | null>(null);
  const [liveDays, setLiveDays] = useState<"0" | "1" | "7">("0");

  // ?region=<id>|ALL and ?area=<shape> from a shared link.
  useEffect(() => {
    if (!regionId && regions.data?.length) {
      const q = new URLSearchParams(window.location.search);
      const wanted = q.get("region");
      setRegionId(wanted === ALL ? ALL : (regions.data.find((r) => r.id === wanted)?.id ?? regions.data[0].id));
      setArea(shapeFromParam(q.get("area")));
    }
  }, [regions.data, regionId]);

  // Keep the link in the address bar shareable.
  useEffect(() => {
    if (!regionId) return;
    const q = new URLSearchParams(window.location.search);
    q.set("region", regionId);
    if (area) q.set("area", shapeToParam(area));
    else q.delete("area");
    window.history.replaceState(null, "", `${window.location.pathname}?${q.toString()}`);
  }, [regionId, area]);

  const allMode = regionId === ALL;
  const selected = useMemo(
    () => (regions.data ? (allMode ? regions.data : regions.data.filter((r) => r.id === regionId)) : []),
    [regions.data, regionId, allMode],
  );
  const selKey = selected.map((r) => r.id).join(",");
  const region = !allMode ? (selected[0] ?? null) : null;

  const indexes = useAsync((s) => (selected.length ? Promise.all(selected.map((r) => fetchCellIndex(r.id, s))) : Promise.resolve(null)), [selKey]);
  // Years come from the regions' own calendars (newest first): whatever the export covers, nothing hard-coded.
  const cals = useAsync((s) => (selected.length ? Promise.all(selected.map((r) => fetchCalendar(r.id, s))) : Promise.resolve(null)), [selKey]);
  const years = useMemo(() => {
    if (!cals.data || cals.data.map((c) => c.regionId).join(",") !== selKey) return [];
    const ys = cals.data.flatMap((c) => c.months.filter((m) => m.calendar != null).map((m) => Number(m.month.slice(0, 4))));
    return [...new Set(ys)].sort((a, b) => b - a);
  }, [cals.data, selKey]);
  const year = pickedYear != null && years.includes(pickedYear) ? pickedYear : (years[0] ?? 0);
  const cellYears = useAsync(
    (s) => (selected.length && year ? Promise.all(selected.map((r) => fetchCellYear(r.id, year, s))) : Promise.resolve(null)),
    [selKey, year],
  );

  useEffect(() => setTool(null), [selKey]);

  /* ---- live FIRMS hotspots (last 24 h / 7 days), via our server route so the MAP_KEY stays private.
          One request per region rectangle (the route refuses huge boxes), merged. */
  const live = useAsync(
    async (signal) => {
      if (liveDays === "0" || !selected.length) return null;
      const parts = await Promise.all(
        selected.map(async (r) => {
          const [latMin, latMax, lonMin, lonMax] = r.bbox;
          const res = await fetch(`/api/hotspots?bbox=${lonMin},${latMin},${lonMax},${latMax}&days=${liveDays}`, { signal });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(body.error ?? `Live hotspots failed (${res.status}).`);
          return body as { hotspots: LiveHotspot[]; fetchedAt: string };
        }),
      );
      return { hotspots: parts.flatMap((p) => p.hotspots), fetchedAt: parts[0]?.fetchedAt ?? new Date().toISOString() };
    },
    [liveDays, selKey],
  );
  const liveData = live.data && liveDays !== "0" ? live.data : null;

  const metricShown: Metric = metric === "viirs" && year < 2012 ? "harmonized" : metric;
  const ready =
    indexes.data &&
    cellYears.data &&
    indexes.data.map((i) => i.regionId).join(",") === selKey &&
    cellYears.data.map((c) => c.regionId).join(",") === selKey &&
    cellYears.data.every((c) => c.year === year);

  const view = useMemo(() => {
    if (!ready) return null;
    const cells: MapCell[] = [];
    /** Every cell with activity (including the sub-1 model estimates hidden on the map), for the CSV. */
    const exportRows: { regionId: string; cell: number; bounds: [number, number, number, number]; value: number }[] = [];
    let total = 0;
    let max = 0;
    let cellCount = 0;
    selected.forEach((r, k) => {
      const index = indexes.data![k];
      const cy = cellYears.data![k];
      cellCount += index.cells.length;
      const sums = new Map<number, number>();
      const monthsUsed = month === "all" ? Object.keys(cy.months) : [month];
      for (const mo of monthsUsed)
        for (const [c, h, m, v] of cy.months[mo] ?? []) {
          const val = metricShown === "modis" ? m : metricShown === "viirs" || year >= VIIRS_FROM ? (v ?? 0) : h;
          if (val > 0) sums.set(c, (sums.get(c) ?? 0) + val);
        }
      for (const [c, value] of sums) {
        const b = index.cells[c];
        if (!b) continue;
        total += value;
        exportRows.push({ regionId: r.id, cell: c, bounds: b, value });
        // Model estimates spread tiny fractions over many cells; only draw cells worth about one detection.
        if (value < 0.5) continue;
        max = Math.max(max, value);
        const where = `${((b[0] + b[2]) / 2).toFixed(2)}°, ${((b[1] + b[3]) / 2).toFixed(2)}°`;
        cells.push({ key: `${r.id}:${c}`, bounds: b, value, label: allMode ? `${r.name} · ${where}` : where });
      }
    });
    const top = [...cells].sort((a, b) => b.value - a.value).slice(0, allMode ? 8 : 6);
    exportRows.sort((a, b) => b.value - a.value);
    return { cells, exportRows, total, max, top, cellCount, gridKm: indexes.data![0]?.gridKm ?? 10 };
  }, [ready, selected, indexes.data, cellYears.data, month, metricShown, year, allMode]);

  /* ---- the drawn area: which cells it counts, per region */
  const areaParts = useMemo<AreaPart[] | null>(() => {
    if (!area || !indexes.data || indexes.data.map((i) => i.regionId).join(",") !== selKey) return null;
    return selected.map((r, k) => ({ region: r, index: indexes.data![k], cells: cellsInShape(indexes.data![k], area) }));
  }, [area, indexes.data, selected, selKey]);
  const highlight = useMemo(
    () => (areaParts ? new Set(areaParts.flatMap((p) => [...p.cells].map((c) => `${p.region.id}:${c}`))) : undefined),
    [areaParts],
  );

  const error = regions.error ?? cals.error ?? indexes.error ?? cellYears.error;
  const period = month === "all" ? String(year) : `${MONTHS_SHORT[Number(month) - 1]} ${year}`;
  const modelled = metricShown === "harmonized" && year < VIIRS_FROM;
  const recordLabel = metricShown === "modis" ? "MODIS" : metricShown === "viirs" || year >= VIIRS_FROM ? "VIIRS" : "model";
  const scopeSlug = allMode ? "all-regions" : region ? slug(region.id) : "";

  const cellsCsv = view
    ? () => ({
        filename: `firebridge_${scopeSlug}_cells_${year}${month === "all" ? "" : `-${month}`}_${metricShown}.csv`,
        csv: toCsv(
          [
            { header: "region_id", value: (r) => r.regionId },
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
        description="Fire detections per 10 km grid cell, from NASA FIRMS. Pick one study region or all of them, a year and optionally one month; hover a cell for its count."
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
                  <SelectItem value={ALL}>All regions ({regions.data?.length ?? "…"})</SelectItem>
                  <SelectSeparator />
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
            <ErrorState error={error} onRetry={() => (regions.retry(), cals.retry(), indexes.retry(), cellYears.retry())} height={560} />
          ) : !view ? (
            <MapLoading height="min(68vh, 640px)" />
          ) : (
            <CellMap
              cells={view.cells}
              max={view.max}
              boxes={selected.map((r) => r.bbox)}
              basemap={basemap}
              height="min(68vh, 640px)"
              ramp={ramp}
              area={area}
              onArea={setArea}
              tool={tool}
              onToolDone={() => setTool(null)}
              highlight={highlight}
              live={liveData?.hotspots ?? []}
            />
          )}
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 pb-2 pt-3 text-[11px] text-muted">
            <span className="flex items-center gap-2">
              1
              <span className="h-2 w-40 rounded-full" style={{ background: rampGradient(ramp, 1) }} aria-hidden />
              {view ? fmtCompact(view.max) : "—"} detections per cell (log scale)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-0 w-5 border-t border-dashed border-white/60" aria-hidden /> Study region{allMode ? "s" : ""}
            </span>
            {area && (
              <span className="flex items-center gap-1.5">
                <span className="h-0 w-5 border-t-2 border-[#2fd3a4]" aria-hidden /> Your area (white outline: cells it counts)
              </span>
            )}
            {liveDays !== "0" && (
              <span className="flex items-center gap-1.5">
                <span className="size-2.5 rounded-full border border-white bg-[#ff3b30]" aria-hidden />
                {live.status === "loading"
                  ? "Loading live hotspots…"
                  : liveData
                    ? `${fmtInt(liveData.hotspots.length)} live VIIRS hotspots, last ${liveDays === "1" ? "24 h" : "7 days"} (NRT, fetched ${liveData.fetchedAt.slice(11, 16)} UTC)`
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
            title={allMode ? `${period} · all regions` : period}
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
                <dd className="font-mono tabular-nums">{view ? `${fmtInt(view.cells.length)} of ${fmtInt(view.cellCount)}` : "—"}</dd>
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

          <ChartCard title="Busiest cells" description={allMode ? "Across all regions: region, cell centre and count" : "Cell centre and detection count"}>
            {view && view.top.length ? (
              <ol className="space-y-2 text-xs">
                {view.top.map((c) => (
                  <li key={c.key} className="flex justify-between gap-3">
                    <span className="min-w-0 font-mono text-muted">{c.label}</span>
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

      {selected.length > 0 && (
        <AreaPanel
          scopeLabel={allMode ? "all study regions" : regionLabel(selected[0])}
          scopeSlug={scopeSlug}
          parts={areaParts}
          viirsFrom={VIIRS_FROM}
          years={years}
          area={area}
          onArea={setArea}
          tool={tool}
          onTool={setTool}
        />
      )}
    </div>
  );
}
