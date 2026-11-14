"use client";

import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartCard, ChartSkeleton, ChartTooltip, ErrorState, Notice } from "@/components/dashboard/primitives";
import { CsvButton } from "@/components/dashboard/csv-button";
import { useAsync } from "@/hooks/use-async";
import { CHART } from "@/lib/colors";
import { round, slug, toCsv } from "@/lib/csv";
import { dailyRange, dayView, fetchDaily, type HarmonizedRegion } from "@/lib/harmonized";
import { cn, fmtCompact, fmtInt } from "@/lib/utils";

const pct = (v: number) => `${v >= 0 ? "+" : "−"}${Math.abs(v * 100).toFixed(0)}%`;

/**
 * Pick one day: its hotspots, how its week compares with the same week in other years, and the month
 * day by day. Reads daily_<region>.json from notebook 5; explains how to get it when it's missing.
 */
export function DailyPanel({ region }: { region: HarmonizedRegion }) {
  const daily = useAsync((s) => fetchDaily(region.id, s), [region.id]);
  const [picked, setPicked] = useState<string | null>(null);
  const file = daily.data && daily.data.regionId === region.id ? daily.data : null;
  const range = file ? dailyRange(file) : null;
  // Default: the busiest day of the region's known event, else the last day on record.
  const date = picked && range && picked >= range.first && picked <= range.last ? picked : range ? defaultDay(file!, region) : null;
  const view = useMemo(() => (file && date ? dayView(file, date) : null), [file, date]);

  const csv =
    file && range
      ? () => {
          const t0 = Date.parse(`${file.start}T00:00:00Z`);
          const rows = file.days.map((d, i) => ({ date: new Date(t0 + i * 86_400_000).toISOString().slice(0, 10), d }));
          return {
            filename: `firebridge_${slug(region.id)}_daily_${range.first}_${range.last}.csv`,
            csv: toCsv(
              [
                { header: "region_id", value: () => region.id },
                { header: "date", value: (r) => r.date },
                { header: "harmonized_hotspots", value: (r) => round(r.d[2], 2) },
                { header: "record_source", value: (r) => (Number(r.date.slice(0, 4)) >= file.viirsFrom ? "VIIRS" : "model") },
                { header: "modis_hotspots", value: (r) => r.d[0] },
                { header: "viirs_hotspots", value: (r) => r.d[1] },
              ],
              rows,
            ),
          };
        }
      : null;

  return (
    <ChartCard
      demo={false}
      title="Pick a day"
      description="Hotspots on one day, its week against the same week in every other year, and that month day by day."
      actions={
        <>
          <label className="flex items-center gap-2 text-xs text-muted">
            <span className="sr-only">Date</span>
            <input
              type="date"
              aria-label="Date"
              disabled={!range}
              min={range?.first}
              max={range?.last}
              value={date ?? ""}
              onChange={(e) => e.target.value && setPicked(e.target.value)}
              className="h-8 rounded-lg border border-border-strong bg-surface/60 px-2 font-mono text-xs text-foreground [color-scheme:dark] focus:border-primary/60 focus:outline-none disabled:opacity-50"
            />
          </label>
          <CsvButton title="daily hotspots, whole record" build={csv} />
        </>
      }
      footer={
        view
          ? `Before ${file!.viirsFrom} a day's value is its month's harmonized total shared out in proportion to MODIS detections that day, so days add up to the monthly calendar. Week = the 7 days centred on the date.`
          : undefined
      }
    >
      {daily.error && !daily.data ? (
        <ErrorState error={daily.error} onRetry={daily.retry} height={200} />
      ) : daily.status === "loading" && !file ? (
        <ChartSkeleton height={220} />
      ) : !file ? (
        <Notice tone="info">
          Daily data for this region isn&apos;t exported yet. Re-run notebook 5 (it now writes <span className="font-mono">daily_&lt;region&gt;.json</span>) and copy
          its output into <span className="font-mono">public/data/</span>; this card then shows any single day.
        </Notice>
      ) : !view ? (
        <p className="text-xs text-muted">No data for that day.</p>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <dl className="grid grid-cols-2 gap-4 text-xs lg:grid-cols-1">
            <div>
              <dt className="text-muted">{view.date}</dt>
              <dd className="mt-1 font-display text-2xl font-semibold tabular-nums">{fmtInt(view.harmonized)}</dd>
              <dd className="text-subtle">
                hotspots · {view.source === "model" ? "model estimate" : "VIIRS"} · MODIS {fmtInt(view.modis)}
                {view.viirs != null ? ` · VIIRS ${fmtInt(view.viirs)}` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-muted">Week vs. median</dt>
              <dd
                className={cn(
                  "mt-1 font-display text-2xl font-semibold tabular-nums",
                  view.windowMedian > 0 && view.window / view.windowMedian - 1 > 0.5 && "text-fire-soft",
                )}
              >
                {view.windowMedian > 0 ? pct(view.window / view.windowMedian - 1) : "—"}
              </dd>
              <dd className="text-subtle">
                {fmtInt(view.window)} vs. median {fmtInt(view.windowMedian)} · rank {view.windowRank} of {view.windowHistory.length}
              </dd>
            </div>
          </dl>
          <div className="lg:col-span-2" style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={view.month} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke={CHART.axis}
                  tick={{ fill: CHART.muted, fontSize: 10 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(d: string) => String(Number(d.slice(8)))}
                  interval="preserveStartEnd"
                />
                <YAxis stroke={CHART.axis} tick={{ fill: CHART.muted, fontSize: 10 }} tickLine={false} axisLine={false} width={40} tickFormatter={(v: number) => fmtCompact(v)} />
                <Tooltip content={<ChartTooltip valueFormatter={(v) => (Number.isFinite(v) ? fmtInt(v) : "—")} />} cursor={{ fill: "rgba(148,178,219,0.08)" }} />
                <Bar dataKey="value" name="Hotspots" isAnimationActive={false} radius={[2, 2, 0, 0]} onClick={(d: { date?: string }) => d?.date && setPicked(d.date)}>
                  {view.month.map((d) => (
                    <Cell key={d.date} cursor="pointer" fill={d.date === view.date ? "#ff7a2f" : d.source === "model" ? "rgba(76,158,255,0.45)" : "rgba(76,158,255,0.8)"} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ChartCard>
  );
}

function defaultDay(file: NonNullable<Parameters<typeof dailyRange>[0]>, region: HarmonizedRegion) {
  const t0 = Date.parse(`${file.start}T00:00:00Z`);
  const iso = (i: number) => new Date(t0 + i * 86_400_000).toISOString().slice(0, 10);
  let best = -1;
  let bestV = -1;
  file.days.forEach((d, i) => {
    const day = iso(i);
    if (day >= region.eventStart && day <= region.eventEnd && (d[2] ?? 0) > bestV) {
      best = i;
      bestV = d[2] ?? 0;
    }
  });
  return iso(best >= 0 ? best : file.days.length - 1);
}
