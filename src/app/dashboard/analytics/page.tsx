"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ChartCard, ChartSkeleton, DemoBadge, EmptyState, ErrorState, Notice, PageHeader, RiskBadge } from "@/components/dashboard/primitives";
import { FrpHistogram, MonthByYearLines, RegionBars, SeasonalBars, SourceLegend, YearTrend } from "@/components/charts/charts";
import { useDetections } from "@/hooks/use-fire-data";
import { useFilters } from "@/context/filters";
import { byRegion, bySeason, byYear, frpHistogram, frpSummary, monthByYear } from "@/lib/analytics";
import { formatRange } from "@/lib/dates";
import { riskFromFrp } from "@/lib/risk";
import { fmtInt, fmtPct } from "@/lib/utils";

type RegionMetric = "count" | "avgFrp" | "highRiskShare";

export default function AnalyticsPage() {
  const { filters, setFilter, reset } = useFilters();
  const { status, data, error, retry } = useDetections();
  const [trendMetric, setTrendMetric] = useState<"count" | "avgFrp">("count");
  const [regionMetric, setRegionMetric] = useState<RegionMetric>("count");
  const [seasonMetric, setSeasonMetric] = useState<"count" | "avgFrp">("count");
  const [dayNight, setDayNight] = useState<"all" | "D" | "N">("all");

  const view = useMemo(() => {
    if (!data) return null;
    const list = dayNight === "all" ? data.detections : data.detections.filter((d) => d.daynight === dayNight);
    return {
      list,
      years: byYear(list),
      mby: monthByYear(list),
      seasons: bySeason(list),
      hist: frpHistogram(list),
      frp: frpSummary(list),
      regions: byRegion(list),
      empty: list.length === 0,
    };
  }, [data, dayNight]);

  const body = (height: number, node: React.ReactNode) => {
    if (status === "error" && !data) return <ErrorState error={error!} onRetry={retry} height={height} />;
    if (!view) return <ChartSkeleton height={height} />;
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
        eyebrow="Analytics"
        title="Historical patterns & distributions"
        description="Explore how illustrative fire activity varies by year, month, season, intensity and geography. All charts respond to the top-bar filters and the local controls on each card."
        actions={
          <>
            <DemoBadge />
            <Segmented
              ariaLabel="Day or night detections"
              value={dayNight}
              onChange={setDayNight}
              options={[
                { value: "all", label: "Day + Night" },
                { value: "D", label: "Day" },
                { value: "N", label: "Night" },
              ]}
            />
          </>
        }
      />

      {data && (
        <p className="text-xs text-muted">
          Window: <span className="text-foreground">{formatRange(data.range)}</span> ·{" "}
          <span className="font-mono text-foreground">{view ? fmtInt(view.list.length) : "—"}</span> detections analysed
          {status === "loading" && <span className="ml-2 text-fire-soft">· updating…</span>}
        </p>
      )}

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Historical wildfire trend"
          description="Annual totals within the selected window — choose “Full archive” for the 2020–2024 trend"
          actions={
            <Segmented
              ariaLabel="Trend metric"
              value={trendMetric}
              onChange={setTrendMetric}
              options={[
                { value: "count", label: "Detections" },
                { value: "avgFrp", label: "Mean FRP" },
              ]}
            />
          }
        >
          {trendMetric === "count" && (
            <div className="mb-3">
              <SourceLegend source={filters.source} />
            </div>
          )}
          {body(280, view && <YearTrend data={view.years} metric={trendMetric} source={filters.source} />)}
          {view && view.years.length < 3 && filters.preset !== "all" && (
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-border bg-surface/50 px-3 py-2 text-xs text-muted">
              Only {view.years.length} year{view.years.length === 1 ? "" : "s"} in this window.
              <Button size="sm" variant="outline" onClick={() => setFilter("preset", "all")}>
                Show full 2020–2024 archive
              </Button>
            </div>
          )}
        </ChartCard>

        <ChartCard title="Monthly comparison by year" description="Each line is one year on a shared Jan–Dec axis, revealing shifts in fire-season timing">
          {body(300, view && <MonthByYearLines rows={view.mby.rows} years={view.mby.years} height={280} />)}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
        <ChartCard
          className="xl:col-span-3"
          title="FRP distribution"
          description="How many detections fall into each Fire Radiative Power band. VIIRS skews lower because its smaller pixels resolve smaller fires."
          footer={
            view && !view.empty ? (
              <div className="flex flex-wrap gap-x-5 gap-y-1">
                <span>
                  Median <span className="font-mono text-muted">{view.frp.median.toFixed(1)} MW</span>
                </span>
                <span>
                  P90 <span className="font-mono text-muted">{view.frp.p90.toFixed(1)} MW</span>
                </span>
                <span>
                  P99 <span className="font-mono text-muted">{view.frp.p99.toFixed(1)} MW</span>
                </span>
                <span>
                  Max <span className="font-mono text-muted">{view.frp.max.toFixed(1)} MW</span> <RiskBadge risk={riskFromFrp(view.frp.max)} className="ml-1" />
                </span>
              </div>
            ) : undefined
          }
        >
          <div className="mb-3">
            <SourceLegend source={filters.source} />
          </div>
          {body(280, view && <FrpHistogram data={view.hist} source={filters.source} />)}
        </ChartCard>

        <ChartCard
          className="xl:col-span-2"
          title="Seasonal comparison"
          description="Southern-hemisphere regions are re-mapped so “Summer” always means local summer"
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
          {body(280, view && <SeasonalBars data={view.seasons} metric={seasonMetric} height={280} />)}
        </ChartCard>
      </div>

      <ChartCard
        title="Geographic hotspot comparison"
        description="Compare monitored regions. Click a bar to filter the whole dashboard to that region."
        actions={
          <Segmented
            ariaLabel="Region metric"
            value={regionMetric}
            onChange={setRegionMetric}
            options={[
              { value: "count", label: "Detections" },
              { value: "avgFrp", label: "Mean FRP" },
              { value: "highRiskShare", label: "High/Extreme %" },
            ]}
          />
        }
      >
        <div className="grid grid-cols-1 gap-6 2xl:grid-cols-2">
          {body(
            320,
            view && (
              <RegionBars
                data={view.regions}
                metric={regionMetric}
                selectedId={filters.regionId === "ALL" ? undefined : filters.regionId}
                onSelect={(id) => setFilter("regionId", filters.regionId === id ? "ALL" : id)}
              />
            ),
          )}
          {view && !view.empty && (
            <div className="scrollbar-thin overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-xs">
                <caption className="sr-only">Regional comparison table</caption>
                <thead>
                  <tr className="border-b border-border text-[10.5px] uppercase tracking-[0.12em] text-subtle">
                    <th scope="col" className="py-2.5 pr-3 font-medium">Region</th>
                    <th scope="col" className="py-2.5 pr-3 text-right font-medium">Detections</th>
                    <th scope="col" className="py-2.5 pr-3 text-right font-medium">Share</th>
                    <th scope="col" className="py-2.5 pr-3 text-right font-medium">Mean FRP</th>
                    <th scope="col" className="py-2.5 pr-3 text-right font-medium">Max FRP</th>
                    <th scope="col" className="py-2.5 text-right font-medium">Peak month</th>
                  </tr>
                </thead>
                <tbody>
                  {view.regions.map((r) => (
                    <tr key={r.regionId} className="border-b border-border/60 last:border-0 hover:bg-surface-2/50">
                      <td className="py-2.5 pr-3">
                        <span className="block font-medium">{r.name}</span>
                        <span className="text-[10.5px] text-subtle">{r.country}</span>
                      </td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{fmtInt(r.count)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted">{fmtPct(r.share, 1)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{r.avgFrp.toFixed(1)}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted">{r.maxFrp.toFixed(0)}</td>
                      <td className="py-2.5 text-right">{r.peakMonth}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </ChartCard>

      <Notice tone="info">
        Statistics describe the illustrative archive only. When the FastAPI backend is connected, the same charts render
        aggregates computed from the team’s processed MODIS/VIIRS dataset.
      </Notice>
    </div>
  );
}
