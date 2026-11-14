"use client";

import { useMemo, useState } from "react";
import { Crosshair, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChartCard, ChartSkeleton, ErrorState } from "@/components/dashboard/primitives";
import { CalendarHeatmap, downloadCalendarPng } from "@/components/charts/harmonized-charts";
import { CsvButton } from "@/components/dashboard/csv-button";
import { PngButton } from "@/components/dashboard/png-button";
import { useAsync } from "@/hooks/use-async";
import {
  areaCalendar,
  cellsInBox,
  compareMonth,
  fetchCellYear,
  yearlyRows,
  yearlyTrend,
  type AreaBox,
  type CellIndex,
  type CellYear,
  type HarmonizedRegion,
} from "@/lib/harmonized";
import { round, slug, toCsv } from "@/lib/csv";
import { useRampName } from "@/lib/ramp";
import { cn, fmtInt } from "@/lib/utils";

/** Loads the region's year files (the years its calendar covers); a year without a file is skipped. */
async function fetchAllYears(regionId: string, years: number[], signal: AbortSignal): Promise<CellYear[]> {
  const res = await Promise.allSettled(years.map((y) => fetchCellYear(regionId, y, signal)));
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const ok = res.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!ok.length) throw new Error("Could not load the cell files for this region.");
  return ok;
}

const fmtCoord = (v: number) => v.toFixed(2);

/**
 * "Pick your own area": drag a box on the map or type its corners, and get a burning-activity
 * calendar, trend and CSV for just that box, summed from the 10 km cells inside the study region.
 */
export function AreaPanel({
  region,
  index,
  viirsFrom,
  years,
  area,
  onArea,
  drawing,
  onDrawing,
}: {
  region: HarmonizedRegion;
  index: CellIndex | null;
  viirsFrom: number;
  /** Years the region's record covers (from its calendar). */
  years: number[];
  area: AreaBox | null;
  onArea: (box: AreaBox | null) => void;
  drawing: boolean;
  onDrawing: (on: boolean) => void;
}) {
  const ramp = useRampName();
  const [form, setForm] = useState({ latMin: "", latMax: "", lonMin: "", lonMax: "" });
  const [formError, setFormError] = useState<string | null>(null);

  // Load the 25 yearly files only once someone actually asks for an area.
  const all = useAsync(
    (s) => (area && years.length ? fetchAllYears(region.id, years, s) : Promise.resolve(null)),
    [region.id, area != null, years.join(",")],
  );

  const result = useMemo(() => {
    if (!area || !index || !all.data || all.data[0]?.regionId !== region.id) return null;
    const cells = cellsInBox(index, area);
    const months = areaCalendar(all.data, cells, viirsFrom);
    const years = yearlyRows(months, viirsFrom);
    const trend = yearlyTrend(years.map((y) => ({ year: y.year, value: y.calendar })));
    const last = [...months].reverse().find((m) => m.calendar != null);
    const cmp = last ? compareMonth(months, last.month, viirsFrom) : null;
    return { cells, months, years, trend, cmp, total: years.reduce((s, y) => s + y.calendar, 0) };
  }, [area, index, all.data, region.id, viirsFrom]);

  const applyForm = () => {
    const v = { latMin: Number(form.latMin), latMax: Number(form.latMax), lonMin: Number(form.lonMin), lonMax: Number(form.lonMax) };
    if (Object.values(form).some((x) => x.trim() === "") || Object.values(v).some((x) => !Number.isFinite(x))) {
      setFormError("Enter all four numbers.");
      return;
    }
    if (v.latMin >= v.latMax || v.lonMin >= v.lonMax) {
      setFormError("Min must be smaller than max.");
      return;
    }
    if (Math.abs(v.latMin) > 90 || Math.abs(v.latMax) > 90 || Math.abs(v.lonMin) > 180 || Math.abs(v.lonMax) > 180) {
      setFormError("Latitude is −90…90, longitude −180…180.");
      return;
    }
    setFormError(null);
    onDrawing(false);
    onArea([v.latMin, v.lonMin, v.latMax, v.lonMax]);
  };

  const label = area ? `${fmtCoord(area[0])}…${fmtCoord(area[2])}°N, ${fmtCoord(area[1])}…${fmtCoord(area[3])}°E` : "";
  const fileBase = area ? `firebridge_${slug(region.id)}_area_${area.map((v) => v.toFixed(2)).join("_")}` : "";

  const csv =
    result && area
      ? () => ({
          filename: `${fileBase}_monthly.csv`,
          csv: toCsv(
            [
              { header: "region_id", value: () => region.id },
              { header: "area_lat_min", value: () => round(area[0], 4) },
              { header: "area_lon_min", value: () => round(area[1], 4) },
              { header: "area_lat_max", value: () => round(area[2], 4) },
              { header: "area_lon_max", value: () => round(area[3], 4) },
              { header: "cells", value: () => result.cells.size },
              { header: "month", value: (m) => m.month },
              { header: "harmonized_hotspots", value: (m) => round(m.calendar, 2) },
              { header: "record_source", value: (m) => m.source },
              { header: "model_estimate", value: (m) => round(m.harmonized, 2) },
              { header: "modis_hotspots", value: (m) => m.modis },
              { header: "viirs_hotspots", value: (m) => m.viirs },
            ],
            result.months,
          ),
        })
      : null;

  const input = (key: keyof typeof form, placeholder: string) => (
    <input
      inputMode="decimal"
      aria-label={placeholder}
      placeholder={placeholder}
      value={form[key]}
      onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
      onKeyDown={(e) => e.key === "Enter" && applyForm()}
      className="h-8 w-full min-w-0 rounded-lg border border-border-strong bg-surface/60 px-2 font-mono text-xs text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none"
    />
  );

  return (
    <ChartCard
      title="Your own area"
      description="Drag a box on the map, or type its corners, to get the burning-activity calendar for just that area. Data covers the study region only."
      actions={
        <>
          <Button type="button" size="sm" variant={drawing ? "default" : "outline"} onClick={() => onDrawing(!drawing)} aria-pressed={drawing}>
            <Crosshair aria-hidden /> {drawing ? "Drag on the map…" : "Draw on map"}
          </Button>
          {area && (
            <Button type="button" size="sm" variant="ghost" onClick={() => (onArea(null), onDrawing(false))}>
              <X aria-hidden /> Clear
            </Button>
          )}
          <CsvButton title="monthly calendar for the selected area" build={csv} />
          <PngButton
            title="area calendar"
            run={
              result
                ? () =>
                    downloadCalendarPng({
                      months: result.months,
                      metric: "calendar",
                      viirsFrom,
                      ramp,
                      title: `Burning-activity calendar · custom area in ${region.name}, ${region.country}`,
                      subtitle: `${label} · ${result.cells.size} cells of 10 km`,
                      filename: `${fileBase}_calendar.png`,
                    })
                : null
            }
          />
        </>
      }
    >
      <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-5">
        {input("latMin", "lat min")}
        {input("latMax", "lat max")}
        {input("lonMin", "lon min")}
        {input("lonMax", "lon max")}
        <Button type="button" size="sm" variant="subtle" onClick={applyForm} className="col-span-2 sm:col-span-1">
          Use these
        </Button>
      </div>
      {formError && <p className="-mt-2 mb-3 text-xs text-fire-soft">{formError}</p>}

      {!area ? (
        <p className="text-xs text-muted">
          No area yet. Study region: {region.bbox[0]}…{region.bbox[1]}°N, {region.bbox[2]}…{region.bbox[3]}°E.
        </p>
      ) : all.error && !all.data ? (
        <ErrorState error={all.error} onRetry={all.retry} height={200} />
      ) : !result ? (
        <ChartSkeleton height={320} />
      ) : result.cells.size === 0 ? (
        <p className="text-xs text-fire-soft">
          No grid cells in {label}. The box has to overlap the study region (dashed outline).
        </p>
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted">Area</dt>
              <dd className="mt-1 font-mono text-foreground">{label}</dd>
              <dd className="text-subtle">{fmtInt(result.cells.size)} cells of 10 km</dd>
            </div>
            <div>
              <dt className="text-muted">Hotspots {result.years[0]?.year}–{result.years.at(-1)?.year}</dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{fmtInt(result.total)}</dd>
              <dd className="text-subtle">harmonized record</dd>
            </div>
            <div>
              <dt className="text-muted">Trend</dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">
                {result.trend ? `${result.trend.pctPerYear >= 0 ? "+" : "−"}${Math.abs(result.trend.pctPerYear * 100).toFixed(1)}%/yr` : "—"}
              </dd>
              <dd className="text-subtle">
                {result.trend ? (result.trend.significant ? `significant, p = ${result.trend.p.toFixed(3)}` : `not significant, p = ${result.trend.p.toFixed(2)}`) : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{result.cmp ? `${result.cmp.month} vs. median` : "Latest month"}</dt>
              <dd
                className={cn(
                  "mt-1 font-display text-xl font-semibold tabular-nums",
                  result.cmp?.vsMedian != null && result.cmp.vsMedian > 0.5 && "text-fire-soft",
                )}
              >
                {result.cmp?.vsMedian == null
                  ? "—"
                  : `${result.cmp.vsMedian >= 0 ? "+" : "−"}${Math.abs(result.cmp.vsMedian * 100).toFixed(0)}%`}
              </dd>
              <dd className="text-subtle">{result.cmp ? `${fmtInt(result.cmp.value)} vs. median ${fmtInt(result.cmp.median)}` : ""}</dd>
            </div>
          </dl>
          <CalendarHeatmap months={result.months} metric="calendar" viirsFrom={viirsFrom} />
          <p className="text-[11px] text-subtle">
            Summed from the exported 10 km cells (cell-months below 0.5 hotspots are not exported), so totals can sit slightly under the
            regional calendar. No model band at cell level.
          </p>
        </div>
      )}
    </ChartCard>
  );
}
