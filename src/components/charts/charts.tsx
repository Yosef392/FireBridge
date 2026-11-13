"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ChartTooltip, Legend } from "@/components/dashboard/primitives";
import { CHART, RISK_COLORS, SERIES, SOURCE_COLORS } from "@/lib/colors";
import { MONTH_LABELS, formatDate } from "@/lib/dates";
import type { FeatureImportance, RiskLevel, SatelliteSource, SourceFilter } from "@/lib/types";
import type { Granularity, MonthPoint, RegionStat, TimePoint } from "@/lib/analytics";
import { fmtCompact, fmtInt, fmtPct } from "@/lib/utils";

const axisProps = {
  stroke: CHART.axis,
  tick: { fill: CHART.muted, fontSize: 11 },
  tickLine: false,
  axisLine: false,
} as const;

const cursorFill = { fill: "rgba(148,178,219,0.06)" };

function sourcesFor(filter: SourceFilter): SatelliteSource[] {
  return filter === "ALL" ? ["MODIS", "VIIRS"] : [filter];
}

export function SourceLegend({ source }: { source: SourceFilter }) {
  const s = sourcesFor(source);
  if (s.length < 2) return null;
  return <Legend items={s.map((k) => ({ label: k, color: SOURCE_COLORS[k] }))} />;
}

/* ---------------------------------------------------------------- time series */

export function DetectionsTimeSeries({
  data,
  granularity,
  source,
  height = 300,
}: {
  data: TimePoint[];
  granularity: Granularity;
  source: SourceFilter;
  height?: number;
}) {
  const keys = sourcesFor(source);
  const tickFmt = (d: string) => {
    const [y, m, day] = d.split("-").map(Number);
    if (granularity === "month") return `${MONTH_LABELS[m - 1]} ’${String(y).slice(2)}`;
    return `${MONTH_LABELS[m - 1]} ${day}`;
  };
  const labelFmt = (d: string) =>
    granularity === "month"
      ? `${MONTH_LABELS[Number(d.slice(5, 7)) - 1]} ${d.slice(0, 4)}`
      : granularity === "week"
        ? `Week of ${formatDate(d)}`
        : formatDate(d);

  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }}>
          <defs>
            {keys.map((k) => (
              <linearGradient key={k} id={`grad-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={SOURCE_COLORS[k]} stopOpacity={0.45} />
                <stop offset="100%" stopColor={SOURCE_COLORS[k]} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="date" {...axisProps} tickFormatter={tickFmt} minTickGap={28} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(v)} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ stroke: "rgba(148,178,219,0.35)", strokeWidth: 1 }}
            content={<ChartTooltip labelFormatter={labelFmt} showTotal />}
          />
          {keys.map((k) => (
            <Area
              key={k}
              type="monotone"
              dataKey={k}
              name={k}
              stackId="s"
              stroke={SOURCE_COLORS[k]}
              strokeWidth={2}
              fill={`url(#grad-${k})`}
              activeDot={{ r: 4, strokeWidth: 2, stroke: CHART.surface }}
              isAnimationActive={false}
            />
          ))}
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- monthly */

export function MonthlyBars({ data, source, height = 260 }: { data: MonthPoint[]; source: SourceFilter; height?: number }) {
  const keys = sourcesFor(source);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap="22%">
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="month" {...axisProps} interval={0} tick={{ fill: CHART.muted, fontSize: 10.5 }} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(v)} width={44} allowDecimals={false} />
          <Tooltip cursor={cursorFill} content={<ChartTooltip showTotal />} />
          {keys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              name={k}
              stackId="m"
              fill={SOURCE_COLORS[k]}
              stroke={CHART.surface}
              strokeWidth={keys.length > 1 ? 1 : 0}
              radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- seasonal */

const SEASON_COLORS: Record<string, string> = {
  Winter: "#3987e5",
  Spring: "#199e70",
  Summer: "#d95926",
  Autumn: "#c98500",
};

export function SeasonalBars({
  data,
  metric = "count",
  height = 260,
}: {
  data: { season: string; count: number; avgFrp: number }[];
  metric?: "count" | "avgFrp";
  height?: number;
}) {
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap="28%">
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="season" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(v)} width={44} />
          <Tooltip
            cursor={cursorFill}
            content={<ChartTooltip valueFormatter={(v) => (metric === "avgFrp" ? `${v.toFixed(1)} MW` : fmtInt(v))} />}
          />
          <Bar dataKey={metric} name={metric === "count" ? "Detections" : "Mean FRP"} radius={[4, 4, 0, 0]} isAnimationActive={false}>
            {data.map((d) => (
              <Cell key={d.season} fill={SEASON_COLORS[d.season]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- regions */

export function RegionBars({
  data,
  metric = "count",
  height,
  onSelect,
  selectedId,
}: {
  data: RegionStat[];
  metric?: "count" | "avgFrp" | "highRiskShare";
  height?: number;
  onSelect?: (id: string) => void;
  selectedId?: string;
}) {
  const sorted = [...data].sort((a, b) => b[metric] - a[metric]);
  const fmt = (v: number) => (metric === "count" ? fmtInt(v) : metric === "avgFrp" ? `${v.toFixed(1)} MW` : fmtPct(v));
  const h = height ?? Math.max(160, sorted.length * 38 + 20);
  const name = metric === "count" ? "Detections" : metric === "avgFrp" ? "Mean FRP" : "High/Extreme share";
  return (
    <div style={{ height: h }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 56, bottom: 0, left: 0 }} barCategoryGap="26%">
          <CartesianGrid stroke={CHART.grid} horizontal={false} />
          <XAxis type="number" {...axisProps} tickFormatter={(v) => (metric === "highRiskShare" ? fmtPct(v) : fmtCompact(v))} />
          <YAxis type="category" dataKey="name" {...axisProps} width={132} tick={{ fill: CHART.text, fontSize: 11.5 }} />
          <Tooltip
            cursor={cursorFill}
            content={<ChartTooltip valueFormatter={(v) => fmt(v)} />}
          />
          <Bar
            dataKey={metric}
            name={name}
            radius={[0, 4, 4, 0]}
            isAnimationActive={false}
            onClick={onSelect ? (d: { regionId?: string }) => d.regionId && onSelect(d.regionId) : undefined}
            label={{ position: "right", fill: CHART.text, fontSize: 11, formatter: (v: number) => fmt(v) }}
            className={onSelect ? "cursor-pointer" : undefined}
          >
            {sorted.map((d) => (
              <Cell key={d.regionId} fill={!selectedId || selectedId === d.regionId ? "#3987e5" : "rgba(57,135,229,0.35)"} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- FRP histogram */

export function FrpHistogram({
  data,
  source,
  height = 280,
}: {
  data: { bin: string; MODIS: number; VIIRS: number }[];
  source: SourceFilter;
  height?: number;
}) {
  const keys = sourcesFor(source);
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 16, left: -8 }} barCategoryGap="12%">
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis
            dataKey="bin"
            {...axisProps}
            interval={0}
            tick={{ fill: CHART.muted, fontSize: 10.5 }}
            label={{ value: "Fire Radiative Power (MW)", position: "insideBottom", offset: -12, fill: CHART.muted, fontSize: 11 }}
          />
          <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(v)} width={44} />
          <Tooltip cursor={cursorFill} content={<ChartTooltip labelFormatter={(l) => `${l} MW`} showTotal />} />
          {keys.map((k) => (
            <Bar key={k} dataKey={k} name={k} fill={SOURCE_COLORS[k]} radius={[4, 4, 0, 0]} isAnimationActive={false} />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- yearly trend */

export function YearTrend({
  data,
  metric,
  source,
  height = 280,
}: {
  data: { year: string; count: number; MODIS: number; VIIRS: number; avgFrp: number }[];
  metric: "count" | "avgFrp";
  source: SourceFilter;
  height?: number;
}) {
  const keys = sourcesFor(source);
  if (metric === "avgFrp") {
    return (
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="year" {...axisProps} />
            <YAxis {...axisProps} width={44} tickFormatter={(v) => `${v}`} />
            <Tooltip content={<ChartTooltip valueFormatter={(v) => `${v.toFixed(1)} MW`} />} cursor={{ stroke: "rgba(148,178,219,0.35)" }} />
            <Line
              type="monotone"
              dataKey="avgFrp"
              name="Mean FRP"
              stroke="#d95926"
              strokeWidth={2}
              dot={{ r: 4, fill: "#d95926", stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    );
  }
  return (
    <div style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: -8 }} barCategoryGap="30%">
          <CartesianGrid stroke={CHART.grid} vertical={false} />
          <XAxis dataKey="year" {...axisProps} />
          <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(v)} width={44} />
          <Tooltip cursor={cursorFill} content={<ChartTooltip showTotal />} />
          {keys.map((k, i) => (
            <Bar
              key={k}
              dataKey={k}
              name={k}
              stackId="y"
              fill={SOURCE_COLORS[k]}
              stroke={CHART.surface}
              strokeWidth={keys.length > 1 ? 1 : 0}
              radius={i === keys.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
              isAnimationActive={false}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ---------------------------------------------------------------- month × year */

export function MonthByYearLines({
  rows,
  years,
  height = 300,
}: {
  rows: Record<string, string | number>[];
  years: string[];
  height?: number;
}) {
  return (
    <div className="space-y-3">
      <Legend items={years.map((y, i) => ({ label: y, color: SERIES[i % SERIES.length] }))} />
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
            <CartesianGrid stroke={CHART.grid} vertical={false} />
            <XAxis dataKey="month" {...axisProps} interval={0} tick={{ fill: CHART.muted, fontSize: 10.5 }} />
            <YAxis {...axisProps} tickFormatter={(v) => fmtCompact(v)} width={44} />
            <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(148,178,219,0.35)" }} />
            {years.map((y, i) => (
              <Line
                key={y}
                type="monotone"
                dataKey={y}
                name={y}
                stroke={SERIES[i % SERIES.length]}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4, stroke: CHART.surface, strokeWidth: 2 }}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- feature importance */

const GROUP_COLORS: Record<FeatureImportance["group"], string> = {
  "Fire history": "#d95926",
  Weather: "#3987e5",
  Vegetation: "#199e70",
  Calendar: "#c98500",
  Terrain: "#d55181",
};

export function FeatureImportanceChart({ data, height }: { data: FeatureImportance[]; height?: number }) {
  const sorted = [...data].sort((a, b) => b.importance - a.importance);
  const groups = [...new Set(sorted.map((d) => d.group))];
  return (
    <div className="space-y-3">
      <Legend items={groups.map((g) => ({ label: g, color: GROUP_COLORS[g] }))} />
      <div style={{ height: height ?? sorted.length * 34 + 16 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={sorted} layout="vertical" margin={{ top: 0, right: 48, bottom: 0, left: 0 }} barCategoryGap="24%">
            <CartesianGrid stroke={CHART.grid} horizontal={false} />
            <XAxis type="number" {...axisProps} tickFormatter={(v) => fmtPct(v)} domain={[0, "dataMax"]} />
            <YAxis type="category" dataKey="feature" {...axisProps} width={168} tick={{ fill: CHART.text, fontSize: 11.5 }} />
            <Tooltip
              cursor={cursorFill}
              content={({ active, payload }) => {
                if (!active || !payload?.length) return null;
                const d = payload[0].payload as FeatureImportance;
                return (
                  <div className="max-w-64 rounded-lg border border-border-strong bg-[#0d1d33]/95 px-3 py-2 text-xs shadow-xl">
                    <p className="font-medium">{d.feature}</p>
                    <p className="mt-0.5 text-muted">{d.description}</p>
                    <p className="mt-1.5 flex justify-between text-muted">
                      {d.group} <span className="font-mono text-foreground">{fmtPct(d.importance, 1)}</span>
                    </p>
                  </div>
                );
              }}
            />
            <Bar
              dataKey="importance"
              radius={[0, 4, 4, 0]}
              isAnimationActive={false}
              label={{ position: "right", fill: CHART.text, fontSize: 11, formatter: (v: number) => fmtPct(v, 1) }}
            >
              {sorted.map((d) => (
                <Cell key={d.feature} fill={GROUP_COLORS[d.group]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- risk distribution (stacked meter) */

export function RiskMeter({ data }: { data: { risk: RiskLevel; count: number; share: number }[] }) {
  const total = data.reduce((s, d) => s + d.count, 0);
  return (
    <div className="space-y-3">
      <div className="flex h-3 w-full gap-0.5 overflow-hidden rounded-full bg-surface-3" role="img" aria-label="Risk level distribution">
        {data.map((d) =>
          d.count > 0 ? (
            <div
              key={d.risk}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{ width: `${(d.count / (total || 1)) * 100}%`, background: RISK_COLORS[d.risk] }}
              title={`${d.risk}: ${fmtInt(d.count)} (${fmtPct(d.share, 1)})`}
            />
          ) : null,
        )}
      </div>
      <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.map((d) => (
          <li key={d.risk} className="rounded-lg border border-border bg-surface/60 px-3 py-2">
            <p className="flex items-center gap-1.5 text-[11px] text-muted">
              <span className="size-2 rounded-full" style={{ background: RISK_COLORS[d.risk] }} aria-hidden />
              {d.risk}
            </p>
            <p className="mt-0.5 font-mono text-sm tabular-nums">
              {fmtInt(d.count)} <span className="text-[11px] text-subtle">· {fmtPct(d.share, 1)}</span>
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}
