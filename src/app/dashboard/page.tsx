"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, Flame, Gauge, MapPinned, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import {
  ChartCard,
  ChartSkeleton,
  DemoBadge,
  EmptyState,
  ErrorState,
  KpiCard,
  Notice,
  PageHeader,
} from "@/components/dashboard/primitives";
import { DetectionsTimeSeries, MonthlyBars, RegionBars, RiskMeter, SeasonalBars, SourceLegend } from "@/components/charts/charts";
import { HotspotTable } from "@/components/dashboard/hotspot-table";
import { useDetections } from "@/hooks/use-fire-data";
import { useFilters } from "@/context/filters";
import {
  HIGH_RISK_FRP,
  HOTSPOT_CELL_DEG,
  HOTSPOT_MIN_DETECTIONS,
  byCalendarMonth,
  byRegion,
  bySeason,
  computeKpis,
  pctChange,
  pickGranularity,
  riskBreakdown,
  timeSeries,
  type Granularity,
} from "@/lib/analytics";
import { daysIn, formatRange } from "@/lib/dates";
import { fmtInt } from "@/lib/utils";

export default function OverviewPage() {
  const { filters, setFilter, reset } = useFilters();
  const { status, data, error, retry } = useDetections();
  const [gran, setGran] = useState<Granularity | "auto">("auto");
  const [seasonMetric, setSeasonMetric] = useState<"count" | "avgFrp">("count");

  const view = useMemo(() => {
    if (!data) return null;
    const list = data.detections;
    const g = gran === "auto" ? pickGranularity(data.range) : gran;
    const k = computeKpis(list);
    const p = computeKpis(data.previous);
    const recent = [...list].sort((a, b) => (b.acq_date + b.acq_time).localeCompare(a.acq_date + a.acq_time)).slice(0, 8);
    return {
      g,
      k,
      deltas: {
        total: pctChange(k.total, p.total),
        hot: pctChange(k.activeHotspots, p.activeHotspots),
        frp: pctChange(k.avgFrp, p.avgFrp),
        high: pctChange(k.highRiskAreas, p.highRiskAreas),
      },
      hasPrev: data.previous.length > 0,
      series: timeSeries(list, data.range, g),
      months: byCalendarMonth(list),
      seasons: bySeason(list),
      regions: byRegion(list),
      risk: riskBreakdown(list),
      recent,
      empty: list.length === 0,
    };
  }, [data, gran]);

  const loading = status === "loading" && !data;
  const refreshing = status === "loading" && !!data;
  const range = data?.range;

  const body = (height: number, node: React.ReactNode) => {
    if (status === "error" && !data) return <ErrorState error={error!} onRetry={retry} height={height} />;
    if (loading || !view) return <ChartSkeleton height={height} />;
    if (view.empty)
      return (
        <EmptyState
          height={height}
          action={
            <Button size="sm" variant="outline" onClick={reset}>
              Reset filters
            </Button>
          }
        />
      );
    return node;
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title="Global fire activity summary"
        description="Aggregated active-fire detections for the selected window, region and sensor. Every number on this page comes from the illustrative demo archive."
        actions={
          <>
            <DemoBadge label="Demo Data — illustrative only" />
            <Button asChild variant="outline" size="sm">
              <Link href="/dashboard/map">
                Open fire map <ArrowRight />
              </Link>
            </Button>
          </>
        }
      />

      {status === "error" && data && (
        <ErrorState error={error!} onRetry={retry} height={0} />
      )}

      <section aria-label="Key indicators" className={`grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}>
        <KpiCard
          label="Total fire detections"
          icon={Flame}
          accent="#ff7a2f"
          loading={loading}
          value={view ? fmtInt(view.k.total) : "—"}
          delta={view?.hasPrev ? view.deltas.total : null}
          invertDelta
          hint={view?.hasPrev ? "vs. previous period" : range ? `${daysIn(range)}-day window` : ""}
        />
        <KpiCard
          label="Active hotspots"
          icon={MapPinned}
          accent="#5ce1e6"
          loading={loading}
          value={view ? fmtInt(view.k.activeHotspots) : "—"}
          delta={view?.hasPrev ? view.deltas.hot : null}
          invertDelta
          hint={`${HOTSPOT_CELL_DEG}° cells with ≥${HOTSPOT_MIN_DETECTIONS} detections`}
        />
        <KpiCard
          label="Average FRP"
          icon={Gauge}
          accent="#4c9eff"
          loading={loading}
          value={view ? view.k.avgFrp.toFixed(1) : "—"}
          unit="MW"
          delta={view?.hasPrev ? view.deltas.frp : null}
          invertDelta
          hint="Mean Fire Radiative Power per detection"
        />
        <KpiCard
          label="High-risk areas"
          icon={ShieldAlert}
          accent="#d23a78"
          loading={loading}
          value={view ? fmtInt(view.k.highRiskAreas) : "—"}
          delta={view?.hasPrev ? view.deltas.high : null}
          invertDelta
          hint={`Hotspot cells with ≥30% detections ≥${HIGH_RISK_FRP} MW`}
        />
      </section>

      <ChartCard
        title="Fire detections over time"
        description={range ? `${formatRange(range)} · stacked by satellite sensor` : "Stacked by satellite sensor"}
        actions={
          <Segmented
            ariaLabel="Time granularity"
            value={gran}
            onChange={setGran}
            options={[
              { value: "auto", label: "Auto" },
              { value: "day", label: "Daily" },
              { value: "week", label: "Weekly" },
              { value: "month", label: "Monthly" },
            ]}
          />
        }
      >
        <div className="mb-3">
          <SourceLegend source={filters.source} />
        </div>
        {body(300, view && <DetectionsTimeSeries data={view.series} granularity={view.g} source={filters.source} />)}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard className="xl:col-span-3" title="Monthly fire activity" description="Detections by calendar month within the selected window">
          <div className="mb-3">
            <SourceLegend source={filters.source} />
          </div>
          {body(260, view && <MonthlyBars data={view.months} source={filters.source} />)}
        </ChartCard>
        <ChartCard
          className="xl:col-span-2"
          title="Seasonal pattern"
          description="Meteorological seasons, adjusted for hemisphere"
          actions={
            <Segmented
              ariaLabel="Seasonal metric"
              value={seasonMetric}
              onChange={setSeasonMetric}
              options={[
                { value: "count", label: "Count" },
                { value: "avgFrp", label: "Mean FRP" },
              ]}
            />
          }
        >
          {body(260, view && <SeasonalBars data={view.seasons} metric={seasonMetric} />)}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="Geographic distribution"
          description="Detections per monitored region — click a bar to focus the dashboard on that region"
        >
          {body(
            300,
            view && (
              <RegionBars
                data={view.regions}
                selectedId={filters.regionId === "ALL" ? undefined : filters.regionId}
                onSelect={(id) => setFilter("regionId", filters.regionId === id ? "ALL" : id)}
              />
            ),
          )}
        </ChartCard>
        <ChartCard className="xl:col-span-2" title="Illustrative risk mix" description={`Detections by FRP-derived risk class (Low <12, Moderate <35, High <100, Extreme ≥100 MW)`}>
          {body(220, view && <RiskMeter data={view.risk} />)}
          <div className="mt-4">
            <Notice>
              Risk classes here are a simple FRP threshold used for visual triage in the demo. They are not the
              output of the prediction model — see <Link className="underline underline-offset-2" href="/dashboard/predictions">Predictions</Link>.
            </Notice>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Recent hotspot activity"
        description="Latest detections in the selected window (simulated records)"
        actions={
          <Button asChild variant="ghost" size="sm">
            <Link href="/dashboard/map">
              View on map <ArrowRight />
            </Link>
          </Button>
        }
      >
        {body(240, view && <HotspotTable rows={view.recent} />)}
      </ChartCard>
    </div>
  );
}
