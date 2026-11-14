"use client";

import { useMemo } from "react";
import { Area, Bar, BarChart, CartesianGrid, Cell, ComposedChart, Line, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, Legend } from "@/components/dashboard/primitives";
import { CHART } from "@/lib/colors";
import { MONTH_LABELS } from "@/lib/dates";
import { metricValue, type CalendarMetric, type CalendarMonth, type Trend, type YearRow } from "@/lib/harmonized";
import { fmtCompact, fmtInt } from "@/lib/utils";
import { rampColor, rampGradient, useRampName, type RampName } from "@/lib/ramp";
import { framedCanvas, downloadCanvas } from "@/lib/png";

export const HARMONIZED_COLORS = {
  harmonized: "#4c9eff",
  viirs: "#e7eef8",
  modis: "#d95926",
  raw: "#e9b949",
  band: "#4c9eff",
  trend: "#2fd3a4",
};

/* ---------------------------------------------------------------- calendar heatmap */

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

  const ramp = useRampName();
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
                      background: v == null ? "transparent" : rampColor(scale(v), ramp),
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
          <span className="h-2 w-40 rounded-full" style={{ background: rampGradient(ramp) }} aria-hidden />
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

/** Draws the calendar heatmap on a canvas (it is HTML, not SVG) and saves it as PNG. */
export function downloadCalendarPng({
  months,
  metric,
  viirsFrom,
  ramp,
  title,
  subtitle,
  filename,
  eventStart,
  eventEnd,
}: {
  months: CalendarMonth[];
  metric: CalendarMetric;
  viirsFrom: number;
  ramp: RampName;
  title: string;
  subtitle?: string;
  filename: string;
  eventStart?: string;
  eventEnd?: string;
}) {
  const byYear = new Map<number, (CalendarMonth | null)[]>();
  let max = 0;
  for (const m of months) {
    const y = Number(m.month.slice(0, 4));
    if (!byYear.has(y)) byYear.set(y, Array(12).fill(null));
    byYear.get(y)![Number(m.month.slice(5, 7)) - 1] = m;
    max = Math.max(max, metricValue(m, metric, viirsFrom) ?? 0);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  const cw = 44;
  const ch = 16;
  const gap = 3;
  const left = 44;
  const top = 18;
  const gridW = left + 12 * (cw + gap);
  const legendH = metric === "calendar" ? 58 : 40;
  const f = framedCanvas(gridW, top + years.length * (ch + gap) + legendH, title, subtitle);
  const { ctx } = f;
  const scale = (v: number) => (max > 0 ? Math.log1p(v) / Math.log1p(max) : 0);
  const ev0 = eventStart?.slice(0, 7);
  const ev1 = eventEnd?.slice(0, 7);
  ctx.font = "10px ui-monospace, monospace";
  ctx.textAlign = "center";
  ctx.fillStyle = "#7f93b0";
  MONTH_LABELS.forEach((l, i) => ctx.fillText(l, f.x + left + i * (cw + gap) + cw / 2, f.y + 10));
  years.forEach((y, r) => {
    const yy = f.y + top + r * (ch + gap);
    ctx.textAlign = "right";
    ctx.fillStyle = y === viirsFrom ? "#e7eef8" : "#7f93b0";
    ctx.fillText(String(y), f.x + left - 8, yy + ch - 4);
    byYear.get(y)!.forEach((m, i) => {
      const x = f.x + left + i * (cw + gap);
      const v = m ? metricValue(m, metric, viirsFrom) : null;
      if (v == null) {
        ctx.strokeStyle = "rgba(148,178,219,0.2)";
        ctx.strokeRect(x + 0.5, yy + 0.5, cw - 1, ch - 1);
        return;
      }
      ctx.fillStyle = rampColor(scale(v), ramp);
      ctx.fillRect(x, yy, cw, ch);
      if (m && ev0 && ev1 && m.month >= ev0 && m.month <= ev1) {
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1.5;
        ctx.strokeRect(x + 0.75, yy + 0.75, cw - 1.5, ch - 1.5);
        ctx.lineWidth = 1;
      }
    });
  });
  // legend
  const ly = f.y + top + years.length * (ch + gap) + 16;
  const grad = ctx.createLinearGradient(f.x + 24, 0, f.x + 224, 0);
  const stops = 16;
  for (let i = 0; i <= stops; i++) grad.addColorStop(i / stops, rampColor(i / stops, ramp));
  ctx.fillStyle = grad;
  ctx.fillRect(f.x + 24, ly, 200, 8);
  ctx.textAlign = "left";
  ctx.fillStyle = "#c7d3e6";
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.fillText("0", f.x + 12, ly + 8);
  ctx.fillText(`${fmtCompact(max)} detections / month (log scale)`, f.x + 232, ly + 8);
  if (metric === "calendar") {
    ctx.fillStyle = "#8ea2bf";
    ctx.fillText(`Before ${viirsFrom}: model estimate on the VIIRS scale · from ${viirsFrom}: real VIIRS · white outline: known event`, f.x + 12, ly + 26);
  }
  downloadCanvas(f.canvas, filename);
}

/* ---------------------------------------------------------------- yearly series */

export function YearlyHarmonizedChart({
  rows,
  viirsFrom,
  log,
  height = 320,
  trend,
}: {
  rows: YearRow[];
  viirsFrom: number;
  log: boolean;
  height?: number;
  /** Theil–Sen trend over the harmonized record, drawn as a dashed line. */
  trend?: Trend | null;
}) {
  const withTrend = rows.map((r) => ({
    ...r,
    trend: trend && r.year >= trend.from && r.year <= trend.to ? Math.max(trend.intercept + trend.slope * r.year, log ? 1 : 0) : null,
  }));
  // Log scale can't show zeros
  const data = log
    ? withTrend.map((r) => ({
        ...r,
        modis: r.modis || null,
        viirs: r.viirs || null,
        raw: r.raw || null,
        band: [Math.max(r.band[0], 1), Math.max(r.band[1], 1)] as [number, number],
      }))
    : withTrend;
  return (
    <div>
      <div className="mb-3">
        <Legend
          items={[
            { label: "Harmonized (VIIRS scale)", color: HARMONIZED_COLORS.harmonized },
            { label: "VIIRS (actual)", color: HARMONIZED_COLORS.viirs },
            { label: "Raw join: MODIS then VIIRS", color: HARMONIZED_COLORS.raw },
            { label: "MODIS (raw)", color: HARMONIZED_COLORS.modis },
            ...(trend ? [{ label: "Trend (Theil–Sen)", color: HARMONIZED_COLORS.trend }] : []),
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
            {trend && (
              <Line
                dataKey="trend"
                name="Trend"
                stroke={HARMONIZED_COLORS.trend}
                strokeWidth={1.5}
                strokeDasharray="6 4"
                dot={false}
                isAnimationActive={false}
                connectNulls
              />
            )}
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

/* ---------------------------------------------------------------- one calendar month across years */

/**
 * The same calendar month in every year, with the median and the 25–75% range of the other years.
 * The selected year is highlighted so "how does this month compare" is answered at a glance.
 */
export function MonthHistoryChart({
  history,
  selectedYear,
  median,
  p25,
  p75,
  height = 220,
}: {
  history: { year: number; value: number; source: "VIIRS" | "model" }[];
  selectedYear: number;
  median: number;
  p25: number;
  p75: number;
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" stroke={CHART.axis} tick={{ fill: CHART.muted, fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
          <YAxis stroke={CHART.axis} tick={{ fill: CHART.muted, fontSize: 10 }} tickLine={false} axisLine={false} width={44} tickFormatter={(v: number) => fmtCompact(v)} />
          <Tooltip
            content={<ChartTooltip valueFormatter={(v) => (Number.isFinite(v) ? fmtInt(v) : "—")} />}
            cursor={{ fill: "rgba(148,178,219,0.08)" }}
          />
          <ReferenceArea y1={p25} y2={p75} fill="#4c9eff" fillOpacity={0.1} stroke="none" ifOverflow="extendDomain" />
          <ReferenceLine
            y={median}
            stroke="#e7eef8"
            strokeDasharray="4 4"
            label={{ value: "median", position: "insideTopRight", fill: CHART.muted, fontSize: 10 }}
          />
          <Bar dataKey="value" name="Hotspots" isAnimationActive={false} radius={[2, 2, 0, 0]}>
            {history.map((h) => (
              <Cell
                key={h.year}
                fill={h.year === selectedYear ? "#ff7a2f" : h.source === "model" ? "rgba(76,158,255,0.45)" : "rgba(76,158,255,0.8)"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
