"use client";

import { useMemo, useState } from "react";
import { Check, Circle, Hexagon, Link2, Square, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ChartCard, ChartSkeleton, ErrorState } from "@/components/dashboard/primitives";
import { CalendarHeatmap, downloadCalendarPng } from "@/components/charts/harmonized-charts";
import { CsvButton } from "@/components/dashboard/csv-button";
import { PngButton } from "@/components/dashboard/png-button";
import { useAsync } from "@/hooks/use-async";
import {
  areaCalendar,
  compareMonth,
  fetchCellYear,
  shapeLabel,
  shapeToParam,
  sumCalendars,
  yearlyRows,
  yearlyTrend,
  type AreaShape,
  type CellIndex,
  type CellYear,
  type HarmonizedRegion,
} from "@/lib/harmonized";
import { round, toCsv } from "@/lib/csv";
import { useRampName } from "@/lib/ramp";
import { cn, fmtInt } from "@/lib/utils";
import type { DrawTool } from "./area-draw";

/** One region's share of a drawn area: its grid and the cells whose centre is inside the area. */
export interface AreaPart {
  region: HarmonizedRegion;
  index: CellIndex;
  cells: Set<number>;
}

/** Loads a region's year files; a missing year is an empty year (see fetchCellYear). */
async function fetchYears(regionId: string, years: number[], signal: AbortSignal): Promise<CellYear[]> {
  const res = await Promise.allSettled(years.map((y) => fetchCellYear(regionId, y, signal)));
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const ok = res.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
  if (!ok.length) throw new Error(`Could not load the cell files for ${regionId}.`);
  return ok;
}

const TOOLS: { tool: DrawTool; label: string; icon: typeof Square; hint: string }[] = [
  { tool: "rect", label: "Box", icon: Square, hint: "Click one corner on the map, then click the opposite corner" },
  { tool: "polygon", label: "Polygon", icon: Hexagon, hint: "Click each corner, click the first point (or double-click) to finish" },
  { tool: "circle", label: "Circle", icon: Circle, hint: "Click the centre, move out to the radius you want and click again" },
];

const pctSigned = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`;

/**
 * "Your own area": draw a box, polygon or circle on the map (and reshape or move it afterwards), or type
 * its coordinates, and get the burning-activity calendar, trend, latest month vs. median and downloads for
 * exactly that area. Works across several study regions at once (in "All regions" view); the area is also
 * kept in the page link so it can be shared.
 */
export function AreaPanel({
  scopeLabel,
  scopeSlug,
  parts,
  viirsFrom,
  years,
  area,
  onArea,
  tool,
  onTool,
}: {
  scopeLabel: string;
  scopeSlug: string;
  /** Per-region cells inside the area (null while there is no area or the grids are loading). */
  parts: AreaPart[] | null;
  viirsFrom: number;
  years: number[];
  area: AreaShape | null;
  onArea: (s: AreaShape | null) => void;
  tool: DrawTool | null;
  onTool: (t: DrawTool | null) => void;
}) {
  const ramp = useRampName();
  const [mode, setMode] = useState<"box" | "circle">("box");
  const [box, setBox] = useState({ latMin: "", latMax: "", lonMin: "", lonMax: "" });
  const [circ, setCirc] = useState({ lat: "", lon: "", km: "" });
  const [formError, setFormError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const used = useMemo(() => (parts ?? []).filter((p) => p.cells.size > 0), [parts]);
  const usedKey = used.map((p) => p.region.id).join(",");

  // Year files only for the regions the area actually touches.
  const all = useAsync(
    (s) => (used.length && years.length ? Promise.all(used.map((p) => fetchYears(p.region.id, years, s))) : Promise.resolve(null)),
    [usedKey, years.join(",")],
  );

  const result = useMemo(() => {
    if (!area || !all.data || all.data.length !== used.length || all.data.some((ys, k) => ys[0]?.regionId !== used[k].region.id)) return null;
    const perRegion = used.map((p, k) => {
      const months = areaCalendar(all.data![k], p.cells, viirsFrom);
      const total = yearlyRows(months, viirsFrom).reduce((s, y) => s + y.calendar, 0);
      return { part: p, months, total };
    });
    const months = sumCalendars(perRegion.map((r) => r.months));
    const yrs = yearlyRows(months, viirsFrom);
    const trend = yearlyTrend(yrs.map((y) => ({ year: y.year, value: y.calendar })));
    const last = [...months].reverse().find((m) => m.calendar != null);
    const cmp = last ? compareMonth(months, last.month, viirsFrom) : null;
    const cells = used.reduce((s, p) => s + p.cells.size, 0);
    const gridKm = used[0]?.index.gridKm ?? 10;
    return { perRegion, months, yrs, trend, cmp, cells, km2: cells * gridKm * gridKm, total: yrs.reduce((s, y) => s + y.calendar, 0) };
  }, [area, all.data, used, viirsFrom]);

  const num = (v: string) => (v.trim() === "" ? NaN : Number(v));
  const applyForm = () => {
    if (mode === "box") {
      const [a, b, c, d] = [num(box.latMin), num(box.lonMin), num(box.latMax), num(box.lonMax)];
      if (![a, b, c, d].every(Number.isFinite)) return setFormError("Enter all four numbers.");
      if (a >= c || b >= d) return setFormError("Min must be smaller than max.");
      if (Math.abs(a) > 90 || Math.abs(c) > 90 || Math.abs(b) > 180 || Math.abs(d) > 180) return setFormError("Latitude is −90…90, longitude −180…180.");
      setFormError(null);
      onTool(null);
      onArea({ kind: "rect", box: [a, b, c, d] });
    } else {
      const [lat, lon, km] = [num(circ.lat), num(circ.lon), num(circ.km)];
      if (![lat, lon, km].every(Number.isFinite)) return setFormError("Enter latitude, longitude and radius.");
      if (Math.abs(lat) > 90 || Math.abs(lon) > 180) return setFormError("Latitude is −90…90, longitude −180…180.");
      if (km <= 0 || km > 2000) return setFormError("Radius is 1–2000 km.");
      setFormError(null);
      onTool(null);
      onArea({ kind: "circle", center: [lat, lon], radiusKm: km });
    }
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      window.prompt("Copy this link:", window.location.href);
    }
  };

  const label = area ? shapeLabel(area) : "";
  const fileBase = area ? `firebridge_${scopeSlug}_area_${area.kind}` : "";

  const csv =
    result && area
      ? () => ({
          filename: `${fileBase}_monthly.csv`,
          csv: toCsv(
            [
              { header: "area", value: () => shapeToParam(area) },
              { header: "regions", value: () => used.map((p) => p.region.id).join(" ") },
              { header: "cells", value: () => result.cells },
              { header: "area_km2", value: () => result.km2 },
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

  const input = (value: string, set: (v: string) => void, placeholder: string) => (
    <input
      inputMode="decimal"
      aria-label={placeholder}
      placeholder={placeholder}
      value={value}
      onChange={(e) => set(e.target.value)}
      onKeyDown={(e) => e.key === "Enter" && applyForm()}
      className="h-8 w-full min-w-0 rounded-lg border border-border-strong bg-surface/60 px-2 font-mono text-xs text-foreground placeholder:text-subtle focus:border-primary/60 focus:outline-none"
    />
  );

  const activeHint = TOOLS.find((t) => t.tool === tool)?.hint;

  return (
    <ChartCard
      title="Your own area"
      description={`Draw a box, polygon or circle on the map, or type it, to get the burning-activity calendar for exactly that area (data inside ${scopeLabel}). After drawing, drag the white handles to reshape it, or drag the shape itself to move it.`}
      actions={
        <>
          {TOOLS.map(({ tool: t, label: l, icon: Icon }) => (
            <Button key={t} type="button" size="sm" variant={tool === t ? "default" : "outline"} aria-pressed={tool === t} onClick={() => onTool(tool === t ? null : t)}>
              <Icon aria-hidden /> {l}
            </Button>
          ))}
          {area && (
            <>
              <Button type="button" size="sm" variant="ghost" onClick={copyLink} title="Copy a link to this map with the area">
                {copied ? <Check aria-hidden /> : <Link2 aria-hidden />} {copied ? "Copied" : "Copy link"}
              </Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => (onArea(null), onTool(null))}>
                <X aria-hidden /> Clear
              </Button>
            </>
          )}
          <CsvButton title="monthly calendar for the selected area" build={csv} />
          <PngButton
            title="area calendar"
            run={
              result && area
                ? () =>
                    downloadCalendarPng({
                      months: result.months,
                      metric: "calendar",
                      viirsFrom,
                      ramp,
                      title: `Burning-activity calendar · your area`,
                      subtitle: `${label} · ${fmtInt(result.km2)} km² · ${used.map((p) => p.region.name).join(", ")}`,
                      filename: `${fileBase}_calendar.png`,
                    })
                : null
            }
          />
        </>
      }
    >
      {activeHint && (
        <p className="mb-3 rounded-lg border border-draw/40 bg-draw/10 px-3 py-2 text-xs text-draw-fg" role="status">
          {activeHint}. Press Esc or click the button again to cancel.
        </p>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented
          ariaLabel="Type coordinates as"
          value={mode}
          onChange={(m) => (setMode(m), setFormError(null))}
          options={[
            { value: "box", label: "Box" },
            { value: "circle", label: "Circle" },
          ]}
        />
        <div className={cn("grid flex-1 gap-2", mode === "box" ? "grid-cols-2 sm:grid-cols-5" : "grid-cols-2 sm:grid-cols-4")}>
          {mode === "box" ? (
            <>
              {input(box.latMin, (v) => setBox((f) => ({ ...f, latMin: v })), "lat min")}
              {input(box.latMax, (v) => setBox((f) => ({ ...f, latMax: v })), "lat max")}
              {input(box.lonMin, (v) => setBox((f) => ({ ...f, lonMin: v })), "lon min")}
              {input(box.lonMax, (v) => setBox((f) => ({ ...f, lonMax: v })), "lon max")}
            </>
          ) : (
            <>
              {input(circ.lat, (v) => setCirc((f) => ({ ...f, lat: v })), "centre lat")}
              {input(circ.lon, (v) => setCirc((f) => ({ ...f, lon: v })), "centre lon")}
              {input(circ.km, (v) => setCirc((f) => ({ ...f, km: v })), "radius km")}
            </>
          )}
          <Button type="button" size="sm" variant="subtle" onClick={applyForm} className="col-span-2 sm:col-span-1">
            Use these
          </Button>
        </div>
      </div>
      {formError && <p className="-mt-2 mb-3 text-xs text-fire-soft">{formError}</p>}

      {!area ? (
        <p className="text-xs text-muted">No area yet. Pick Box, Polygon or Circle above and draw on the map.</p>
      ) : !parts ? (
        <ChartSkeleton height={240} />
      ) : used.length === 0 ? (
        <p className="text-xs text-fire-soft">
          {label} has no grid cells inside {scopeLabel}. The area has to overlap a study region (dashed outline){scopeLabel === "all study regions" ? "" : ", or switch the map to All regions"}.
        </p>
      ) : all.error && !all.data ? (
        <ErrorState error={all.error} onRetry={all.retry} height={200} />
      ) : !result ? (
        <ChartSkeleton height={320} />
      ) : (
        <div className="space-y-4">
          <dl className="grid grid-cols-2 gap-4 text-xs sm:grid-cols-4">
            <div>
              <dt className="text-muted">Area</dt>
              <dd className="mt-1 font-mono text-foreground">{label}</dd>
              <dd className="text-subtle">
                {fmtInt(result.km2)} km² · {fmtInt(result.cells)} cells of 10 km
              </dd>
            </div>
            <div>
              <dt className="text-muted">
                Hotspots {result.yrs[0]?.year}–{result.yrs.at(-1)?.year}
              </dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">{fmtInt(result.total)}</dd>
              <dd className="text-subtle">harmonized record · {fmtInt(result.total / Math.max(1, result.yrs.length))}/yr</dd>
            </div>
            <div>
              <dt className="text-muted">Trend</dt>
              <dd className="mt-1 font-display text-xl font-semibold tabular-nums">
                {result.trend ? `${pctSigned(result.trend.pctPerYear)}/yr` : "—"}
              </dd>
              <dd className="text-subtle">
                {result.trend
                  ? result.trend.significant
                    ? `significant, p = ${result.trend.p.toFixed(3)}`
                    : `not significant, p = ${result.trend.p.toFixed(2)}`
                  : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">{result.cmp ? `${result.cmp.month} vs. median` : "Latest month"}</dt>
              <dd className={cn("mt-1 font-display text-xl font-semibold tabular-nums", result.cmp?.vsMedian != null && result.cmp.vsMedian > 0.5 && "text-fire-soft")}>
                {result.cmp?.vsMedian == null ? "—" : pctSigned(result.cmp.vsMedian)}
              </dd>
              <dd className="text-subtle">{result.cmp ? `${fmtInt(result.cmp.value)} vs. median ${fmtInt(result.cmp.median)}` : ""}</dd>
            </div>
          </dl>

          {result.perRegion.length > 1 && (
            <table className="w-full text-left text-xs">
              <thead className="text-subtle">
                <tr className="border-b border-border">
                  <th className="py-1.5 pr-3 font-medium">Region in the area</th>
                  <th className="py-1.5 pr-3 text-right font-medium">Cells</th>
                  <th className="py-1.5 pr-3 text-right font-medium">km²</th>
                  <th className="py-1.5 text-right font-medium">Hotspots</th>
                </tr>
              </thead>
              <tbody>
                {result.perRegion.map((r) => (
                  <tr key={r.part.region.id} className="border-b border-border/60">
                    <td className="py-1.5 pr-3 text-foreground">
                      {r.part.region.name}, {r.part.region.country}
                    </td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmtInt(r.part.cells.size)}</td>
                    <td className="py-1.5 pr-3 text-right font-mono tabular-nums">{fmtInt(r.part.cells.size * r.part.index.gridKm ** 2)}</td>
                    <td className="py-1.5 text-right font-mono tabular-nums">{fmtInt(r.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          <CalendarHeatmap months={result.months} metric="calendar" viirsFrom={viirsFrom} />
          <p className="text-[11px] text-subtle">
            A 10 km cell counts when its centre is inside the area (outlined on the map). Summed from the exported cells
            (cell-months below 0.5 hotspots are not exported), so totals can sit slightly under the regional calendar. No model band
            at cell level.
          </p>
        </div>
      )}
    </ChartCard>
  );
}
