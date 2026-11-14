"use client";

import { useMemo } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, Legend } from "@/components/dashboard/primitives";
import { CHART } from "@/lib/colors";
import { MONTH_LABELS } from "@/lib/dates";
import { metricValue, type CalendarMetric, type CalendarMonth, type YearRow } from "@/lib/harmonized";
import { fmtCompact, fmtInt } from "@/lib/utils";

export const HARMONIZED_COLORS = {
  harmonized: "#4c9eff",
  viirs: "#e7eef8",
  modis: "#d95926",
  raw: "#e9b949",
  band: "#4c9eff",
};

/* ---------------------------------------------------------------- calendar heatmap */

export const RAMP = ["#0e1d33", "#2b1f45", "#5c2346", "#932c3c", "#c84a2c", "#ee7a2a", "#f7b24a", "#ffe8a3"];

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** t in [0, 1] → colour on the fire ramp. */
export function rampColor(t: number) {
  const x = Math.min(1, Math.max(0, t)) * (RAMP.length - 1);
  const i = Math.min(RAMP.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(RAMP[i]);
  const b = hexToRgb(RAMP[i + 1]);
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export function CalendarHeatmap({
  months,
  metric,
  viirsFrom,
  eventStart,
  eventEnd,
}: {
  months: CalendarMonth[];
  metric: CalendarMetric;
  viirsFrom: number;
  eventStart?: string;
  eventEnd?: string;
}) {
  const { years, grid, max } = useMemo(() => {
    const g = new Map<number, (CalendarMonth | null)[]>();
    for (const m of months) {
      const y = Number(m.month.slice(0, 4));
      const mo = Number(m.month.slice(5, 7)) - 1;
      if (!g.has(y)) g.set(y, Array(12).fill(null));
      g.get(y)![mo] = m;
    }
    let mx = 0;
    for (const m of months) mx = Math.max(mx, metricValue(m, metric, viirsFrom) ?? 0);
    return { years: [...g.keys()].sort((a, b) => a - b), grid: g, max: mx };
  }, [months, metric, viirsFrom]);

  const scale = (v: number) => (max > 0 ? Math.log1p(v) / Math.log1p(max) : 0);
  const evStart = eventStart?.slice(0, 7);
  const evEnd = eventEnd?.slice(0, 7);

  return (
    <div>
      <div className="overflow-x-auto">
        <div className="grid min-w-[520px] gap-[3px]" style={{ gridTemplateColumns: "44px repeat(12, minmax(0, 1fr))" }} role="table" aria-label="Monthly fire activity by year">
          <div />
          {MONTH_LABELS.map((l) => (
            <div key={l} className="pb-1 text-center font-mono text-[10px] text-subtle" role="columnheader">
              {l}
            </div>
          ))}
          {years.map((y) => (
            <div key={y} className="contents" role="row">
              <div
                className={`flex items-center justify-end pr-2 font-mono text-[10px] tabular-nums ${y === viirsFrom ? "text-foreground" : "text-subtle"}`}
                role="rowheader"
              >
                {y}
              </div>
              {grid.get(y)!.map((m, i) => {
                const v = m ? metricValue(m, metric, viirsFrom) : null;
                const inEvent = m && evStart && evEnd ? m.month >= evStart && m.month <= evEnd : false;
                const modelled = m?.source === "model" && metric === "calendar";
                return (
                  <div
                    key={i}
                    role="cell"
                    title={
                      m
                        ? `${MONTH_LABELS[i]} ${y}: ${v == null ? "no data" : fmtInt(v)} detections` +
                          (modelled ? " (model estimate)" : "") +
                          (inEvent ? " · known event" : "")
                        : undefined
                    }
                    className={`h-[18px] rounded-[3px] ${y === viirsFrom ? "mt-[3px]" : ""}`}
                    style={{
                      background: v == null ? "transparent" : rampColor(scale(v)),
                      border: v == null ? "1px dashed rgba(148,178,219,0.15)" : undefined,
                      outline: inEvent ? "1.5px solid #ffffff" : undefined,
                      outlineOffset: inEvent ? "-1.5px" : undefined,
                      opacity: modelled ? 0.92 : 1,
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2 text-[11px] text-muted">
        <span className="flex items-center gap-2">
          0
          <span className="h-2 w-40 rounded-full" style={{ background: `linear-gradient(90deg, ${RAMP.join(", ")})` }} aria-hidden />
          {fmtCompact(max)} detections / month (log scale)
        </span>
        {evStart && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm outline outline-[1.5px] outline-white" aria-hidden /> Known event
          </span>
        )}
        {metric === "calendar" && <span>Before {viirsFrom}: model estimate on the VIIRS scale · from {viirsFrom}: real VIIRS</span>}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- yearly series */

export function YearlyHarmonizedChart({
  rows,
  viirsFrom,
  log,
  height = 320,
}: {
  rows: YearRow[];
  viirsFrom: number;
  log: boolean;
  height?: number;
}) {
  // Log scale can't show zeros
  const data = log
    ? rows.map((r) => ({
        ...r,
        modis: r.modis || null,
        viirs: r.viirs || null,
        raw: r.raw || null,
        band: [Math.max(r.band[0], 1), Math.max(r.band[1], 1)] as [number, number],
      }))
    : rows;
  return (
    <div>
      <div className="mb-3">
        <Legend
          items={[
            { label: "Harmonized (VIIRS scale)", color: HARMONIZED_COLORS.harmonized },
            { label: "VIIRS (actual)", color: HARMONIZED_COLORS.viirs },
            { label: "Raw join: MODIS then VIIRS", color: HARMONIZED_COLORS.raw },
            { label: "MODIS (raw)", color: HARMONIZED_COLORS.modis },
          ]}
        />
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -4 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="year" stroke={CHART.axis} tick={{ fill: CHART.muted, fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis
              stroke={CHART.axis}
              tick={{ fill: CHART.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={48}
              scale={log ? "log" : "auto"}
              domain={(log ? ["auto", "auto"] : [0, "auto"]) as [number | string, number | string]}
              allowDataOverflow={log}
              tickFormatter={(v: number) => fmtCompact(v)}
            />
            <Tooltip
              content={<ChartTooltip valueFormatter={(v) => (Number.isFinite(v) ? fmtInt(v) : "—")} />}
              cursor={{ stroke: "rgba(148,178,219,0.35)" }}
            />
            <ReferenceLine
              x={viirsFrom}
              stroke="rgba(231,238,248,0.45)"
              strokeDasharray="4 4"
              label={{ value: "VIIRS starts", position: "insideTopLeft", fill: CHART.muted, fontSize: 11 }}
            />
            <Area
              dataKey="band"
              name="Model band (10–90%)"
              stroke="none"
              fill={HARMONIZED_COLORS.band}
              fillOpacity={0.18}
              isAnimationActive={false}
              legendType="none"
            />
            <Line dataKey="modis" name="MODIS (raw)" stroke={HARMONIZED_COLORS.modis} strokeWidth={1.5} dot={false} isAnimationActive={false} connectNulls={false} />
            <Line
              dataKey="raw"
              name="Raw join"
              stroke={HARMONIZED_COLORS.raw}
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              isAnimationActive={false}
            />
            <Line
              dataKey="viirs"
              name="VIIRS (actual)"
              stroke={HARMONIZED_COLORS.viirs}
              strokeWidth={2}
              dot={{ r: 2.5, fill: HARMONIZED_COLORS.viirs, stroke: CHART.surface, strokeWidth: 1 }}
              isAnimationActive={false}
              connectNulls={false}
            />
            <Line
              dataKey="harmonized"
              name="Harmonized"
              stroke={HARMONIZED_COLORS.harmonized}
              strokeWidth={2.5}
              dot={{ r: 3, fill: HARMONIZED_COLORS.harmonized, stroke: CHART.surface, strokeWidth: 1.5 }}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
