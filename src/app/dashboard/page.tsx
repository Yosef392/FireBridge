"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, BadgeCheck, CalendarDays, Flame, MapPinned, Satellite } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Segmented } from "@/components/ui/segmented";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChartCard, ChartSkeleton, ErrorState, KpiCard, PageHeader } from "@/components/dashboard/primitives";
import { RegionLines, monthLabel, regionColor } from "@/components/charts/region-charts";
import { useAsync } from "@/hooks/use-async";
import { useCoverage } from "@/hooks/use-coverage";
import { fetchAllCalendars, fetchModelReport, regionLabel, seasonalProfile } from "@/lib/harmonized";
import { cn, fmtInt } from "@/lib/utils";

const VIIRS_FROM = 2013;
const fmtX = (v: number) => `${v.toFixed(2)}×`;
const fmtSigned = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(0)}%`;

export default function OverviewPage() {
  const data = useAsync((s) => fetchAllCalendars(VIIRS_FROM, s), []);
  const report = useAsync((s) => fetchModelReport(s), []);
  const [pickedYear, setYear] = useState<number | null>(null);
  const cov = useCoverage();
  // Whole years in the data; the page opens on the newest one.
  const fullYears = useMemo(
    () => (data.data ? [...new Set(data.data.flatMap((r) => r.years.map((y) => y.year)))].sort((a, b) => a - b) : []),
    [data.data],
  );
  const year = pickedYear != null && fullYears.includes(pickedYear) ? pickedYear : (fullYears.at(-1) ?? 0);
  const nRegions = data.data?.length;
  const span = fullYears.length ? `${fullYears[0]}–${fullYears.at(-1)}` : "";
  const [log, setLog] = useState(true);
  const [focus, setFocus] = useState<string | null>(null);

  const view = useMemo(() => {
    if (!data.data) return null;
    const regions = data.data;
    const allYears = [...new Set(regions.flatMap((r) => r.years.map((y) => y.year)))].sort((a, b) => a - b);

    const yearTotal = (y: number) =>
      regions.reduce((s, r) => s + (r.years.find((row) => row.year === y)?.calendar ?? 0), 0);

    const rows = allYears.map((y) => {
      const row: Record<string, number | null> = { year: y };
      for (const r of regions) {
        const v = r.years.find((row) => row.year === y)?.calendar ?? null;
        row[r.region.id] = log && v != null && v <= 0 ? null : v;
      }
      return row;
    });

    const table = regions.map((r, i) => {
      const thisYear = r.years.find((row) => row.year === year)?.calendar ?? 0;
      const ref = r.years.filter((row) => row.year >= VIIRS_FROM && row.year !== year);
      const avg = ref.reduce((s, row) => s + row.calendar, 0) / Math.max(1, ref.length);
      const profile = seasonalProfile(r.months);
      const peak = profile.indexOf(Math.max(...profile));
      const busiest = [...r.years].sort((a, b) => b.calendar - a.calendar)[0];
      return {
        i,
        region: r.region,
        thisYear,
        vsAvg: avg > 0 ? ((thisYear - avg) / avg) * 100 : 0,
        peak,
        busiest,
      };
    });

    const total = yearTotal(year);
    const prev = yearTotal(year - 1);
    const top = [...table].sort((a, b) => b.thisYear - a.thisYear)[0];
    return { allYears, rows, table, total, prev, top };
  }, [data.data, year, log]);

  const main = report.data?.test_overall.find((r) => r.model?.includes("main")) ?? null;
  const jumps = report.data?.jump_check ?? [];
  const loading = !view;
  const error = data.error ?? report.error;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Overview"
        title={nRegions ? `Fire activity in our ${nRegions} study regions` : "Fire activity in our study regions"}
        description="Every number here is on the VIIRS scale: real VIIRS counts from 2013, and the model's VIIRS-equivalent estimate built from MODIS before that. Source: NASA FIRMS active fires, vegetation fires only."
        actions={
          <>
            <Badge variant="success">
              <Satellite className="size-3" aria-hidden /> NASA FIRMS data
            </Badge>
            <label className="w-32">
              <span className="sr-only">Year</span>
              <Select value={year ? String(year) : ""} onValueChange={(v) => setYear(Number(v))}>
                <SelectTrigger aria-label="Year">
                  <span className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-primary" aria-hidden />
                    <SelectValue />
                  </span>
                </SelectTrigger>
                <SelectContent>
                  {(view?.allYears ?? [year]).slice().reverse().map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </label>
          </>
        }
      />

      {error && <ErrorState error={error} onRetry={() => (data.retry(), report.retry())} height={160} />}

      <section aria-label="Key indicators" className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label={`Fire detections in ${year}`}
          icon={Flame}
          accent="#ff7a2f"
          loading={loading}
          value={view ? fmtInt(view.total) : "—"}
          delta={view && view.prev > 0 ? (view.total - view.prev) / view.prev : null}
          invertDelta
          hint={`All ${nRegions ?? ""} regions, vs. ${year - 1}${year < VIIRS_FROM ? " · model estimate" : ""}`}
        />
        <KpiCard
          label={`Most active region in ${year}`}
          icon={MapPinned}
          accent="#5ce1e6"
          loading={loading}
          value={view ? view.top.region.name : "—"}
          hint={view ? `${view.top.region.country} · ${fmtInt(view.top.thisYear)} detections` : ""}
        />
        <KpiCard
          label="Sensor jump removed"
          icon={CalendarDays}
          accent="#4c9eff"
          loading={!report.data}
          value={jumps.length ? `${jumps.filter((j) => Math.abs(Math.log(j.harmonized_jump / j.real_change)) < Math.log(1.25)).length} / ${jumps.length}` : "—"}
          hint="Regions where the harmonized 2012 step is within 25% of the real change"
        />
        <KpiCard
          label={cov?.testFrom ? `Test error, ${cov.testFrom}–${cov.testTo}` : "Test error"}
          icon={BadgeCheck}
          accent="#2fa98c"
          loading={!report.data}
          value={main ? `${main.monthly_wape.toFixed(1)}%` : "—"}
          hint={main ? `Monthly error of the main model · total bias ${main.total_bias > 0 ? "+" : ""}${main.total_bias.toFixed(1)}%` : ""}
        />
      </section>

      <ChartCard
        demo={false}
        title="Fire detections per year, by region"
        description={`One consistent record per region, ${span}. Before 2013 the values are the model's estimate on the VIIRS scale. Hover a region in the table to highlight it.`}
        actions={
          <Segmented
            ariaLabel="Scale"
            value={log ? "log" : "linear"}
            onChange={(v) => setLog(v === "log")}
            options={[
              { value: "log", label: "Log" },
              { value: "linear", label: "Linear" },
            ]}
          />
        }
      >
        {view ? (
          <RegionLines
            rows={view.rows}
            series={data.data!.map((r) => ({ id: r.region.id, label: regionLabel(r.region) }))}
            xKey="year"
            log={log}
            highlight={focus}
            markX={VIIRS_FROM}
            markLabel="Real VIIRS from here"
            height={340}
          />
        ) : (
          <ChartSkeleton height={340} />
        )}
      </ChartCard>

      <ChartCard
        demo={false}
        title={`Regions in ${year}`}
        description={`Compared with each region's own ${VIIRS_FROM}–${fullYears.at(-1) ?? ""} average (the selected year left out). Click a row to open its calendar.`}
      >
        {view ? (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left text-xs">
              <thead className="text-subtle">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Region</th>
                  <th className="py-2 pr-3 font-medium">Fire type</th>
                  <th className="py-2 pr-3 text-right font-medium">Detections</th>
                  <th className="py-2 pr-3 text-right font-medium">vs. average</th>
                  <th className="py-2 pr-3 font-medium">Usual peak</th>
                  <th className="py-2 pr-3 font-medium">Busiest year</th>
                  <th className="py-2 text-right font-medium">2012 jump: raw → harmonized</th>
                </tr>
              </thead>
              <tbody>
                {view.table.map((t) => {
                  const j = jumps.find((x) => x.area === t.region.id);
                  return (
                    <tr
                      key={t.region.id}
                      className="cursor-pointer border-b border-border/60 transition-colors hover:bg-surface-2/60"
                      onMouseEnter={() => setFocus(t.region.id)}
                      onMouseLeave={() => setFocus(null)}
                      onClick={() => (window.location.href = `/dashboard/calendar?region=${t.region.id}`)}
                    >
                      <td className="py-2.5 pr-3">
                        <span className="flex items-center gap-2 font-medium text-foreground">
                          <span className="size-2 rounded-full" style={{ background: regionColor(t.i) }} aria-hidden />
                          {regionLabel(t.region)}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 text-muted">{t.region.fireType}</td>
                      <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{fmtInt(t.thisYear)}</td>
                      <td className={cn("py-2.5 pr-3 text-right font-mono tabular-nums", t.vsAvg > 25 ? "text-[#ff8f92]" : t.vsAvg < -25 ? "text-[#5fd3b2]" : "text-muted")}>
                        {fmtSigned(t.vsAvg)}
                      </td>
                      <td className="py-2.5 pr-3 text-muted">{monthLabel(t.peak + 1)}</td>
                      <td className="py-2.5 pr-3 font-mono tabular-nums text-muted">
                        {t.busiest.year} <span className="text-subtle">({fmtInt(t.busiest.calendar)})</span>
                      </td>
                      <td className="py-2.5 text-right font-mono tabular-nums text-muted">
                        {j ? (
                          <>
                            {fmtX(j.raw_jump)} → <span className="text-foreground">{fmtX(j.harmonized_jump)}</span>
                            <span className="text-subtle"> (real {fmtX(j.real_change)})</span>
                          </>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <ChartSkeleton height={260} />
        )}
      </ChartCard>

      <div className="flex flex-wrap gap-2">
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/calendar">
            Burning-activity calendar <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/map">
            Fire map <ArrowRight />
          </Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <Link href="/dashboard/model">
            How the model works <ArrowRight />
          </Link>
        </Button>
      </div>
    </div>
  );
}
