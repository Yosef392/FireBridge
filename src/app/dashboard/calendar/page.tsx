"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, CalendarDays, Satellite, Scale } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Segmented } from "@/components/ui/segmented";
import { ChartCard, ChartSkeleton, ErrorState, KpiCard, Notice, PageHeader } from "@/components/dashboard/primitives";
import { CalendarHeatmap, YearlyHarmonizedChart } from "@/components/charts/harmonized-charts";
import { useAsync } from "@/hooks/use-async";
import {
  fetchCalendar,
  fetchHarmonizedRegions,
  fetchModelReport,
  yearlyRows,
  type CalendarMetric,
  type ScoreRow,
} from "@/lib/harmonized";
import { cn, fmtInt } from "@/lib/utils";

const METRICS: { value: CalendarMetric; label: string }[] = [
  { value: "calendar", label: "Harmonized" },
  { value: "raw", label: "Raw join" },
  { value: "modis", label: "MODIS" },
  { value: "viirs", label: "VIIRS" },
];

const METRIC_HELP: Record<CalendarMetric, string> = {
  calendar: "One consistent record: real VIIRS from the switch on, the model's VIIRS-equivalent estimate before it.",
  raw: "What you get by joining the raw records: MODIS before VIIRS existed, VIIRS after. Note the jump.",
  modis: "MODIS detections only (Terra + Aqua, ~1 km pixels).",
  viirs: "VIIRS detections only (Suomi NPP, 375 m pixels). Empty before it existed.",
};

const fmtX = (v: number) => `${v.toFixed(2)}×`;
const fmtPctSigned = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1)}%`;

export default function CalendarPage() {
  const regions = useAsync((s) => fetchHarmonizedRegions(s), []);
  const report = useAsync((s) => fetchModelReport(s), []);
  const [regionId, setRegionId] = useState<string | null>(null);
  const [metric, setMetric] = useState<CalendarMetric>("calendar");
  const [scale, setScale] = useState<"linear" | "log">("log");

  useEffect(() => {
    if (!regionId && regions.data?.length) setRegionId(regions.data[0].id);
  }, [regions.data, regionId]);

  const calendar = useAsync((s) => (regionId ? fetchCalendar(regionId, s) : Promise.resolve(null)), [regionId]);

  const region = regions.data?.find((r) => r.id === regionId) ?? null;
  const viirsFrom = report.data?.viirs_from ?? 2013;
  const years = useMemo(() => (calendar.data ? yearlyRows(calendar.data.months, viirsFrom) : []), [calendar.data, viirsFrom]);
  const jump = report.data?.jump_check.find((j) => j.area === regionId) ?? null;
  const anomalies = (report.data?.anomalies ?? []).filter((a) => a.area === regionId);
  const testRegion = report.data?.test_by_region.find((t) => t.area === regionId) ?? null;

  const loadError = regions.error ?? report.error ?? calendar.error;
  const retry = () => {
    regions.retry();
    report.retry();
    calendar.retry();
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Harmonization"
        title="Burning-activity calendar"
        description="MODIS (since 2000) and VIIRS (since 2012) count fires differently, so joining them creates a fake jump. FireBridge rebuilds the MODIS years on the VIIRS scale, giving one consistent record per region."
        actions={
          <>
            <Badge variant="success">
              <Satellite className="size-3" aria-hidden /> NASA FIRMS data
            </Badge>
            <label className="block w-64">
              <span className="sr-only">Study region</span>
              <Select value={regionId ?? undefined} onValueChange={setRegionId}>
                <SelectTrigger aria-label="Study region">
                  <span className="flex items-center gap-2 truncate">
                    <CalendarDays className="size-4 shrink-0 text-accent" aria-hidden />
                    <SelectValue placeholder="Loading regions…" />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(regions.data ?? []).map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}, {r.country}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </>
        }
      />

      {loadError && !regions.data && <ErrorState error={loadError} onRetry={retry} height={200} />}

      {region && (
        <p className="text-xs text-muted">
          <span className="text-foreground">{region.fireType}</span> · goal: {region.goal} · known event{" "}
          <span className="font-mono text-foreground">
            {region.eventStart.slice(0, 7)} → {region.eventEnd.slice(0, 7)}
          </span>{" "}
          (outlined on the calendar)
        </p>
      )}

      {/* The 2012 check */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <KpiCard
          label="Raw jump at the switch"
          value={jump ? fmtX(jump.raw_jump) : "—"}
          icon={ArrowRightLeft}
          hint="VIIRS 2013–15 ÷ MODIS 2009–11: the fake step when the raw records are joined"
          accent="#e9b949"
          loading={!report.data}
        />
        <KpiCard
          label="Real change"
          value={jump ? fmtX(jump.real_change) : "—"}
          icon={Scale}
          hint="MODIS on both sides: how much fire activity actually changed"
          accent="#d95926"
          loading={!report.data}
        />
        <KpiCard
          label="Harmonized jump"
          value={jump ? fmtX(jump.harmonized_jump) : "—"}
          icon={CalendarDays}
          hint="VIIRS 2013–15 ÷ harmonized 2009–11: should match the real change"
          accent="#4c9eff"
          loading={!report.data}
        />
      </div>

      <ChartCard
        demo={false}
        title="Monthly fire detections, Nov 2000–2024"
        description={METRIC_HELP[metric]}
        actions={<Segmented ariaLabel="Calendar metric" value={metric} onChange={setMetric} options={METRICS} />}
      >
        {calendar.error && !calendar.data ? (
          <ErrorState error={calendar.error} onRetry={calendar.retry} height={420} />
        ) : !calendar.data ? (
          <ChartSkeleton height={420} />
        ) : (
          <CalendarHeatmap
            months={calendar.data.months}
            metric={metric}
            viirsFrom={viirsFrom}
            eventStart={region?.eventStart}
            eventEnd={region?.eventEnd}
          />
        )}
      </ChartCard>

      <ChartCard
        demo={false}
        title="Yearly totals: the 2012 jump disappears"
        description="The dashed yellow line joins the raw records; the blue line is the harmonized record with its model band (10–90%)."
        actions={
          <Segmented
            ariaLabel="Y-axis scale"
            value={scale}
            onChange={setScale}
            options={[
              { value: "log", label: "Log" },
              { value: "linear", label: "Linear" },
            ]}
          />
        }
        footer="The band shows how much the 5 ensemble models disagree, not the full error: see the test scores below for that."
      >
        {!calendar.data ? <ChartSkeleton height={320} /> : <YearlyHarmonizedChart rows={years} viirsFrom={viirsFrom} log={scale === "log"} />}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard
          demo={false}
          className="xl:col-span-3"
          title="How accurate is it?"
          description={
            report.data
              ? `Trained on ${viirsFrom}–${report.data.split.train_until}, tuned on ${report.data.split.val_years.join(", ")}, tested once on ${report.data.split.test_from}–${report.data.years[1]} (years never seen in training).`
              : undefined
          }
        >
          {!report.data ? (
            <ChartSkeleton height={180} />
          ) : report.data.test_overall.length === 0 ? (
            <p className="text-xs text-muted">
              Test scores aren&apos;t in this export yet. Re-run the latest notebook 4 (it saves report.json), then notebook 5.
            </p>
          ) : (
            <>
              <ScoreTable rows={report.data.test_overall} />
              {testRegion && (
                <p className="mt-3 text-xs text-muted">
                  This region, main model: total bias <span className="font-mono text-foreground">{fmtPctSigned(testRegion.total_bias)}</span>, monthly
                  error <span className="font-mono text-foreground">{testRegion.monthly_wape.toFixed(1)}%</span>.
                </p>
              )}
            </>
          )}
        </ChartCard>

        <ChartCard demo={false} className="xl:col-span-2" title="Months that stand out" description="z-score vs. the same month in other years, leaving the event year out of the baseline.">
          {!report.data ? (
            <ChartSkeleton height={180} />
          ) : anomalies.length === 0 ? (
            <p className="text-xs text-muted">No anomalies exported for this region.</p>
          ) : (
            <ul className="divide-y divide-border text-xs">
              {anomalies.map((a) => (
                <li key={a.month} className="flex items-center justify-between gap-3 py-2">
                  <span className="font-mono text-foreground">{a.month}</span>
                  <span className="text-muted">{fmtInt(a.calendar)} detections</span>
                  <span className="text-subtle">{a.source === "model" ? "model" : "VIIRS"}</span>
                  <span className={cn("font-mono tabular-nums", a.in_event ? "text-fire-soft" : "text-foreground")}>
                    z {a.z.toFixed(1)}
                    {a.in_event ? " · event" : ""}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>

      <Notice tone="info">
        Data: NASA FIRMS active fires, MODIS Collection 6.1 and VIIRS S-NPP 375 m, vegetation fires only. Each region is a fixed rectangle from the
        team&apos;s dataset plan. Model: per-region VIIRS/MODIS ratio × an XGBoost correction learned on 10 km × month cells
        {report.data ? ` (${report.data.members}-model ensemble, generated ${report.data.generated_at.slice(0, 10)})` : ""}.
      </Notice>
    </div>
  );
}

function ScoreTable({ rows }: { rows: ScoreRow[] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-xs">
        <thead className="text-subtle">
          <tr className="border-b border-border">
            <th className="py-2 pr-3 font-medium">Model</th>
            <th className="py-2 pr-3 text-right font-medium">Total bias</th>
            <th className="py-2 pr-3 text-right font-medium">Monthly error</th>
            <th className="py-2 text-right font-medium">Monthly corr.</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const main = r.model?.includes("main");
            return (
              <tr key={r.model} className={cn("border-b border-border/60", main && "text-foreground")}>
                <td className={cn("py-2 pr-3", main ? "font-medium" : "text-muted")}>{r.model}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtPctSigned(r.total_bias)}</td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">{r.monthly_wape.toFixed(1)}%</td>
                <td className="py-2 text-right font-mono tabular-nums">{r.monthly_corr == null ? "—" : r.monthly_corr.toFixed(3)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
