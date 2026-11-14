"use client";

import { useMemo, useState } from "react";
import { Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { ChartCard, ChartSkeleton, ErrorState, Notice, PageHeader } from "@/components/dashboard/primitives";
import { RegionLines, monthLabel, regionColor } from "@/components/charts/region-charts";
import { useAsync } from "@/hooks/use-async";
import { fetchAllCalendars, regionLabel, seasonalProfile } from "@/lib/harmonized";
import { fmtInt } from "@/lib/utils";

const VIIRS_FROM = 2013;

export default function AnalyticsPage() {
  const data = useAsync((s) => fetchAllCalendars(VIIRS_FROM, s), []);
  const [focus, setFocus] = useState<string | null>(null);
  const [seasonAlign, setSeasonAlign] = useState<"calendar" | "local">("calendar");

  const view = useMemo(() => {
    if (!data.data) return null;
    const regions = data.data;
    const series = regions.map((r) => ({ id: r.region.id, label: regionLabel(r.region) }));

    // 1. Seasonal profile: share of the year's fires per month
    const profiles = regions.map((r) => seasonalProfile(r.months));
    const seasonRows = Array.from({ length: 12 }, (_, i) => {
      const row: Record<string, number | string | null> = { month: String(i + 1) };
      regions.forEach((r, k) => {
        // "local": shift southern-hemisphere regions by six months so both hemispheres share a season axis
        const idx = seasonAlign === "local" && r.region.hemisphere === "S" ? (i + 6) % 12 : i;
        row[r.region.id] = profiles[k][idx] * 100;
      });
      return row;
    });

    // 2. VIIRS ÷ MODIS ratio per year, where both sensors exist
    const years = [...new Set(regions.flatMap((r) => r.years.map((y) => y.year)))].filter((y) => y >= VIIRS_FROM).sort();
    const ratioRows = years.map((y) => {
      const row: Record<string, number | null> = { year: y };
      for (const r of regions) {
        const yr = r.years.find((x) => x.year === y);
        row[r.region.id] = yr && yr.viirs && yr.modis > 0 ? yr.viirs / yr.modis : null;
      }
      return row;
    });

    // 3. Each year relative to the region's own average (harmonized record)
    const allYears = [...new Set(regions.flatMap((r) => r.years.map((y) => y.year)))].sort();
    const means = regions.map((r) => r.years.reduce((s, y) => s + y.calendar, 0) / Math.max(1, r.years.length));
    const indexRows = allYears.map((y) => {
      const row: Record<string, number | null> = { year: y };
      regions.forEach((r, k) => {
        const v = r.years.find((x) => x.year === y)?.calendar;
        row[r.region.id] = v != null && means[k] > 0 && v > 0 ? (v / means[k]) * 100 : null;
      });
      return row;
    });

    // 4. Summary table
    const table = regions.map((r, k) => {
      const ratios = ratioRows.map((row) => row[r.region.id]).filter((v): v is number => v != null);
      const ratio = ratios.reduce((s, v) => s + v, 0) / Math.max(1, ratios.length);
      const vals = r.years.map((y) => y.calendar);
      const sd = Math.sqrt(vals.reduce((s, v) => s + (v - means[k]) ** 2, 0) / Math.max(1, vals.length - 1));
      const p = profiles[k];
      const top3 = [...p.keys()].sort((a, b) => p[b] - p[a]).slice(0, 3);
      return {
        k,
        region: r.region,
        ratio,
        ratioMin: Math.min(...ratios),
        ratioMax: Math.max(...ratios),
        cv: means[k] > 0 ? (sd / means[k]) * 100 : 0,
        peakShare: top3.reduce((s, i) => s + p[i], 0) * 100,
        peakMonths: top3.sort((a, b) => a - b).map((i) => monthLabel(i + 1)),
        mean: means[k],
      };
    });

    return { series, seasonRows, ratioRows, indexRows, table };
  }, [data.data, seasonAlign]);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Analytics"
        title="How the regions differ"
        description="Seasons, sensor differences and year-to-year swings across the 7 study regions, all from the harmonized NASA FIRMS record."
        actions={
          <Badge variant="success">
            <Satellite className="size-3" aria-hidden /> NASA FIRMS data
          </Badge>
        }
      />

      {data.error && <ErrorState error={data.error} onRetry={data.retry} height={160} />}

      <ChartCard
        title="VIIRS sees more fires than MODIS, but by how much depends on the place"
        description="Yearly VIIRS detections ÷ MODIS detections, 2013–2024 (log scale). This is why one global conversion factor can't harmonize the record: small agricultural fires (Nile Delta) are mostly invisible to MODIS, big forest fires (Canada, Portugal) are not."
      >
        {view ? (
          <RegionLines
            rows={view.ratioRows}
            series={view.series}
            xKey="year"
            log
            highlight={focus}
            height={320}
            valueFormatter={(v) => (Number.isFinite(v) ? `${v.toFixed(2)}×` : "—")}
            yFormatter={(v) => `${v}×`}
          />
        ) : (
          <ChartSkeleton height={320} />
        )}
      </ChartCard>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Fire season"
          description={
            seasonAlign === "local"
              ? "Southern-hemisphere regions shifted by six months, so the axis means the same season everywhere (labels are northern months)."
              : "Average share of each year's fires that falls in each month (harmonized record)."
          }
          actions={
            <Segmented
              ariaLabel="Month alignment"
              value={seasonAlign}
              onChange={setSeasonAlign}
              options={[
                { value: "calendar", label: "Calendar months" },
                { value: "local", label: "Align hemispheres" },
              ]}
            />
          }
        >
          {view ? (
            <RegionLines
              rows={view.seasonRows}
              series={view.series}
              xKey="month"
              highlight={focus}
              height={300}
              xFormatter={(m) => monthLabel(m)}
              valueFormatter={(v) => `${v.toFixed(1)}%`}
              yFormatter={(v) => `${v}%`}
            />
          ) : (
            <ChartSkeleton height={300} />
          )}
        </ChartCard>

        <ChartCard
          title="Good and bad years"
          description="Each year's detections as a share of the region's 2001–2024 average (100 = average year, log scale)."
        >
          {view ? (
            <RegionLines
              rows={view.indexRows}
              series={view.series}
              xKey="year"
              log
              highlight={focus}
              height={300}
              markX={VIIRS_FROM}
              valueFormatter={(v) => (Number.isFinite(v) ? `${v.toFixed(0)}` : "—")}
              yFormatter={(v) => `${v}`}
            />
          ) : (
            <ChartSkeleton height={300} />
          )}
        </ChartCard>
      </div>

      <ChartCard title="Region profiles" description="Hover a row to highlight that region in the charts.">
        {view ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-xs">
              <thead className="text-subtle">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Region</th>
                  <th className="py-2 pr-3 text-right font-medium">VIIRS ÷ MODIS</th>
                  <th className="py-2 pr-3 text-right font-medium">Range by year</th>
                  <th className="py-2 pr-3 font-medium">Main fire months</th>
                  <th className="py-2 pr-3 text-right font-medium">Share in those 3 months</th>
                  <th className="py-2 pr-3 text-right font-medium">Average year</th>
                  <th className="py-2 text-right font-medium">Year-to-year swing</th>
                </tr>
              </thead>
              <tbody>
                {view.table.map((t) => (
                  <tr
                    key={t.region.id}
                    className="border-b border-border/60 transition-colors hover:bg-surface-2/60"
                    onMouseEnter={() => setFocus(t.region.id)}
                    onMouseLeave={() => setFocus(null)}
                  >
                    <td className="py-2.5 pr-3">
                      <span className="flex items-center gap-2 font-medium text-foreground">
                        <span className="size-2 rounded-full" style={{ background: regionColor(t.k) }} aria-hidden />
                        {regionLabel(t.region)}
                      </span>
                    </td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.ratio.toFixed(1)}×</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums text-muted">
                      {t.ratioMin.toFixed(1)}–{t.ratioMax.toFixed(1)}×
                    </td>
                    <td className="py-2.5 pr-3 text-muted">{t.peakMonths.join(", ")}</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{t.peakShare.toFixed(0)}%</td>
                    <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{fmtInt(t.mean)}</td>
                    <td className="py-2.5 text-right font-mono tabular-nums text-muted">±{t.cv.toFixed(0)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ChartSkeleton height={240} />
        )}
        <div className="mt-4">
          <Notice tone="info">
            “Year-to-year swing” is the standard deviation of yearly totals as a share of the average. Average year is on the VIIRS
            scale, 2001–2024.
          </Notice>
        </div>
      </ChartCard>
    </div>
  );
}
