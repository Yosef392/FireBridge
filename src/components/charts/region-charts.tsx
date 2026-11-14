"use client";

import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ChartTooltip, Legend } from "@/components/dashboard/primitives";
import { CHART, SERIES } from "@/lib/colors";
import { MONTH_LABELS } from "@/lib/dates";
import { fmtCompact, fmtInt } from "@/lib/utils";

export interface RegionSeries {
  id: string;
  label: string;
}

export const regionColor = (i: number) => SERIES[i % SERIES.length];

/**
 * One line per region over a shared x axis.
 * `rows` are objects keyed by the x field plus one numeric (or null) field per region id.
 */
export function RegionLines({
  rows,
  series,
  xKey,
  log = false,
  height = 320,
  highlight,
  markX,
  markLabel,
  xFormatter,
  valueFormatter = (v: number) => (Number.isFinite(v) ? fmtInt(v) : "—"),
  yFormatter = (v: number) => fmtCompact(v),
  yDomain,
}: {
  rows: Record<string, number | string | null>[];
  series: RegionSeries[];
  xKey: string;
  log?: boolean;
  height?: number;
  highlight?: string | null;
  markX?: number | string;
  markLabel?: string;
  xFormatter?: (v: string) => string;
  valueFormatter?: (v: number) => string;
  yFormatter?: (v: number) => string;
  yDomain?: [number | string, number | string];
}) {
  return (
    <div>
      <div className="mb-3">
        <Legend items={series.map((s, i) => ({ label: s.label, color: regionColor(i) }))} />
      </div>
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 12, right: 16, bottom: 0, left: -4 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis
              dataKey={xKey}
              stroke={CHART.axis}
              tick={{ fill: CHART.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              tickFormatter={xFormatter}
            />
            <YAxis
              stroke={CHART.axis}
              tick={{ fill: CHART.muted, fontSize: 11 }}
              tickLine={false}
              axisLine={false}
              width={52}
              scale={log ? "log" : "auto"}
              domain={yDomain ?? ((log ? ["auto", "auto"] : [0, "auto"]) as [number | string, number | string])}
              allowDataOverflow={log}
              tickFormatter={yFormatter}
            />
            <Tooltip
              content={<ChartTooltip valueFormatter={valueFormatter} labelFormatter={xFormatter} />}
              cursor={{ stroke: "rgba(148,178,219,0.35)" }}
            />
            {markX != null && (
              <ReferenceLine
                x={markX}
                stroke="rgba(231,238,248,0.45)"
                strokeDasharray="4 4"
                label={markLabel ? { value: markLabel, position: "insideTopLeft", fill: CHART.muted, fontSize: 11 } : undefined}
              />
            )}
            {series.map((s, i) => (
              <Line
                key={s.id}
                dataKey={s.id}
                name={s.label}
                stroke={regionColor(i)}
                strokeWidth={highlight === s.id ? 3 : 1.75}
                strokeOpacity={highlight && highlight !== s.id ? 0.3 : 1}
                dot={false}
                activeDot={{ r: 3 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export const monthLabel = (m: string | number) => MONTH_LABELS[Number(m) - 1] ?? String(m);
