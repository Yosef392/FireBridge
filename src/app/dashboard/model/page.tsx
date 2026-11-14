"use client";

import { Satellite } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { ChartCard, ChartSkeleton, ErrorState, Notice, PageHeader } from "@/components/dashboard/primitives";
import { useAsync } from "@/hooks/use-async";
import { fetchHarmonizedRegions, fetchModelReport, regionLabel, type HarmonizedRegion, type ScoreRow } from "@/lib/harmonized";
import { cn } from "@/lib/utils";

const fmtPct = (v: number) => `${v > 0 ? "+" : v < 0 ? "−" : "±"}${Math.abs(v).toFixed(1)}%`;
const fmtX = (v: number) => `${v.toFixed(2)}×`;

const FEATURE_TEXT: Record<string, string> = {
  modis_count: "MODIS detections in the cell that month (Terra + Aqua)",
  terra_count: "Terra detections",
  aqua_count: "Aqua detections",
  frp_sum: "Total fire radiative power (MW)",
  frp_max: "Strongest single fire (MW)",
  frp_mean: "Average fire radiative power (MW)",
  pixel_area_mean: "Average MODIS pixel size (bigger near the swath edge)",
  day_share: "Share of detections made in daytime",
  nb_count: "MODIS detections in the 8 neighbouring cells",
  cell_mean: "The cell's long-run average MODIS count",
  cell_month_mean: "The cell's long-run average for that calendar month",
  month_sin: "Time of year (sine)",
  month_cos: "Time of year (cosine)",
};

const STEPS = [
  {
    title: "1. Grid the fires",
    text: "Every MODIS and VIIRS vegetation-fire detection from NASA FIRMS is counted in 10 × 10 km equal-area cells, per month, for 2000–2024.",
  },
  {
    title: "2. Start from a ratio",
    text: "For each region we measure how many VIIRS detections there are per MODIS detection in the training years. That ratio alone already removes most of the jump.",
  },
  {
    title: "3. Learn the correction",
    text: "Gradient-boosted trees (XGBoost, Poisson loss) learn how much to adjust that ratio in each cell and month, from MODIS-only inputs: fire strength, pixel size, neighbours, season and region.",
  },
  {
    title: "4. Rebuild the past",
    text: "Applied to 2000–2012, where only MODIS exists, the model gives the VIIRS-equivalent count. Five models trained on different samples give the uncertainty band.",
  },
];

export default function ModelPage() {
  const report = useAsync((s) => fetchModelReport(s), []);
  const regions = useAsync((s) => fetchHarmonizedRegions(s), []);
  const r = report.data;
  const name = (id: string) => {
    const reg = regions.data?.find((x) => x.id === id);
    return reg ? regionLabel(reg as HarmonizedRegion) : id.replaceAll("_", " ");
  };
  const loro = r
    ? [...new Set(r.leave_one_region_out.map((x) => x.held_out))].map((id) => ({
        id,
        ratio: r.leave_one_region_out.find((x) => x.held_out === id && !x.model?.includes("correction")),
        main: r.leave_one_region_out.find((x) => x.held_out === id && x.model?.includes("correction")),
      }))
    : [];

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Model"
        title="How the harmonization works, and how well"
        description="FireBridge converts MODIS fire counts into what VIIRS would have seen, so 2000–2012 and 2013–2024 can be compared directly. All scores below are on years the model never trained on."
        actions={
          <Badge variant="success">
            <Satellite className="size-3" aria-hidden /> NASA FIRMS data
          </Badge>
        }
      />

      {(report.error || regions.error) && (
        <ErrorState error={(report.error ?? regions.error)!} onRetry={() => (report.retry(), regions.retry())} height={160} />
      )}

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {STEPS.map((s) => (
          <div key={s.title} className="rounded-xl border border-border bg-surface/60 p-4">
            <p className="text-sm font-medium">{s.title}</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">{s.text}</p>
          </div>
        ))}
      </section>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Test years"
          description={r ? `Trained on 2013–${r.split.train_until}, tuned on ${r.split.val_years.join(", ")}, tested once on ${r.split.test_from}–${r.years[1]}.` : undefined}
        >
          {r ? <Scores rows={r.test_overall} /> : <ChartSkeleton height={160} />}
          <p className="mt-3 text-[11px] leading-relaxed text-subtle">
            Total bias: how far the summed count is off. Monthly error (WAPE): the typical miss on a single month, as a share of
            the real count. Cell deviance: Poisson deviance per 10 km cell-month (lower is better), which shows how much better the
            learned models are at the map level.
          </p>
        </ChartCard>

        <ChartCard title="Test years, by region" description="Main model (ratio × learned correction)">
          {r ? (
            <table className="w-full text-left text-xs">
              <thead className="text-subtle">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Region</th>
                  <th className="py-2 pr-3 text-right font-medium">Total bias</th>
                  <th className="py-2 pr-3 text-right font-medium">Monthly error</th>
                  <th className="py-2 text-right font-medium">Monthly corr.</th>
                </tr>
              </thead>
              <tbody>
                {r.test_by_region.map((t) => (
                  <tr key={t.area} className="border-b border-border/60">
                    <td className="py-2 pr-3">{name(t.area)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtPct(t.total_bias)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums">{t.monthly_wape.toFixed(1)}%</td>
                    <td className="py-2 text-right font-mono tabular-nums">{t.monthly_corr?.toFixed(3) ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ChartSkeleton height={220} />
          )}
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <ChartCard
          title="Does the 2012 jump disappear?"
          description="Change from 2009–11 to 2013–15. The raw join jumps because VIIRS sees more fires; the harmonized record should match the real change measured by MODIS alone."
        >
          {r ? (
            <table className="w-full text-left text-xs">
              <thead className="text-subtle">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Region</th>
                  <th className="py-2 pr-3 text-right font-medium">Raw join</th>
                  <th className="py-2 pr-3 text-right font-medium">Real change</th>
                  <th className="py-2 text-right font-medium">Harmonized</th>
                </tr>
              </thead>
              <tbody>
                {r.jump_check.map((j) => (
                  <tr key={j.area} className="border-b border-border/60">
                    <td className="py-2 pr-3">{name(j.area)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-[#e9b949]">{fmtX(j.raw_jump)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">{fmtX(j.real_change)}</td>
                    <td className="py-2 text-right font-mono tabular-nums text-foreground">{fmtX(j.harmonized_jump)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ChartSkeleton height={220} />
          )}
        </ChartCard>

        <ChartCard
          title="A region the model has never seen"
          description="Leave-one-region-out: train on 6 regions, predict the 7th. Total bias on the held-out region."
        >
          {r ? (
            <table className="w-full text-left text-xs">
              <thead className="text-subtle">
                <tr className="border-b border-border">
                  <th className="py-2 pr-3 font-medium">Held-out region</th>
                  <th className="py-2 pr-3 text-right font-medium">Ratio of other regions</th>
                  <th className="py-2 text-right font-medium">Main model</th>
                </tr>
              </thead>
              <tbody>
                {loro.map((l) => (
                  <tr key={l.id} className="border-b border-border/60">
                    <td className="py-2 pr-3">{name(l.id)}</td>
                    <td className="py-2 pr-3 text-right font-mono tabular-nums text-muted">{l.ratio ? fmtPct(l.ratio.total_bias) : "—"}</td>
                    <td
                      className={cn(
                        "py-2 text-right font-mono tabular-nums",
                        l.main && Math.abs(l.main.total_bias) > 25 ? "text-[#ff8f92]" : "text-foreground",
                      )}
                    >
                      {l.main ? fmtPct(l.main.total_bias) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <ChartSkeleton height={220} />
          )}
          <div className="mt-4">
            <Notice tone="info">
              Our main limitation: a fire type the model hasn't seen (small straw fires in the Delta, forest fires in Portugal) is
              poorly predicted. The model needs some years where both sensors overlap in a region to calibrate it. That overlap
              exists everywhere from 2012 on, so this matters for new regions, not for the record shown here.
            </Notice>
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="Inputs the model uses"
        description={r ? `${r.features.length} features per 10 km cell and month, all from MODIS (VIIRS is only the target). ${r.members} models in the ensemble.` : undefined}
      >
        {r ? (
          <div className="grid grid-cols-1 gap-x-8 gap-y-2 text-xs md:grid-cols-2">
            {r.features
              .filter((f) => !f.startsWith("region_"))
              .map((f) => (
                <div key={f} className="flex gap-3 border-b border-border/50 py-1.5">
                  <code className="w-36 shrink-0 font-mono text-[11px] text-accent">{f}</code>
                  <span className="text-muted">{FEATURE_TEXT[f] ?? f}</span>
                </div>
              ))}
            <div className="flex gap-3 border-b border-border/50 py-1.5">
              <code className="w-36 shrink-0 font-mono text-[11px] text-accent">region_*</code>
              <span className="text-muted">Which study region the cell is in ({r.features.filter((f) => f.startsWith("region_")).length} flags)</span>
            </div>
          </div>
        ) : (
          <ChartSkeleton height={200} />
        )}
      </ChartCard>
    </div>
  );
}

function Scores({ rows }: { rows: ScoreRow[] }) {
  return (
    <table className="w-full text-left text-xs">
      <thead className="text-subtle">
        <tr className="border-b border-border">
          <th className="py-2 pr-3 font-medium">Model</th>
          <th className="py-2 pr-3 text-right font-medium">Cell deviance</th>
          <th className="py-2 pr-3 text-right font-medium">Total bias</th>
          <th className="py-2 pr-3 text-right font-medium">Monthly error</th>
          <th className="py-2 text-right font-medium">Corr.</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r) => {
          const main = r.model?.includes("main");
          return (
            <tr key={r.model} className="border-b border-border/60">
              <td className={cn("py-2 pr-3", main ? "font-medium text-foreground" : "text-muted")}>{r.model}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{r.poisson_deviance_cell?.toFixed(2) ?? "—"}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{fmtPct(r.total_bias)}</td>
              <td className="py-2 pr-3 text-right font-mono tabular-nums">{r.monthly_wape.toFixed(1)}%</td>
              <td className="py-2 text-right font-mono tabular-nums">{r.monthly_corr?.toFixed(3) ?? "—"}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
