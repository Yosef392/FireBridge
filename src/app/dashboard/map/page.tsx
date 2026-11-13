"use client";

import { useMemo, useState } from "react";
import { Layers, Satellite } from "lucide-react";
import { FireMap } from "@/components/map";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { ChartCard, DemoBadge, EmptyState, ErrorState, Notice, PageHeader, RiskBadge } from "@/components/dashboard/primitives";
import { HotspotTable } from "@/components/dashboard/hotspot-table";
import { MapLoading } from "@/components/map";
import { useDetections } from "@/hooks/use-fire-data";
import { useFilters } from "@/context/filters";
import { REGION_BY_ID } from "@/data/demo/regions";
import { RISK_COLORS, SOURCE_COLORS } from "@/lib/colors";
import { RISK_LEVELS, type FireDetection, type RiskLevel } from "@/lib/types";
import type { Basemap } from "@/components/map/leaflet-map";
import { formatRange } from "@/lib/dates";
import { cn, fmtInt } from "@/lib/utils";

const MAX_POINTS = 2500;
const WORLD: { center: [number, number]; zoom: number } = { center: [18, 15], zoom: 2 };

export default function MapPage() {
  const { filters, reset } = useFilters();
  const { status, data, error, retry } = useDetections();
  const [visibleRisks, setVisibleRisks] = useState<Set<RiskLevel>>(new Set(RISK_LEVELS));
  const [sampling, setSampling] = useState<"representative" | "intense" | "recent">("representative");
  const [basemap, setBasemap] = useState<Basemap>("dark");

  const view = useMemo(() => {
    if (!data) return null;
    const filtered = data.detections.filter((d) => visibleRisks.has(d.risk));
    const byFrp = [...filtered].sort((a, b) => b.frp - a.frp);
    let picked: FireDetection[];
    if (sampling === "intense") picked = byFrp.slice(0, MAX_POINTS);
    else if (sampling === "recent")
      picked = [...filtered].sort((a, b) => (b.acq_date + b.acq_time).localeCompare(a.acq_date + a.acq_time)).slice(0, MAX_POINTS);
    else {
      // Evenly spaced sample keeps the true mix of risk classes and regions.
      const step = Math.max(1, filtered.length / MAX_POINTS);
      picked = [];
      for (let i = 0; i < filtered.length && picked.length < MAX_POINTS; i += step) picked.push(filtered[Math.floor(i)]);
    }
    // Draw low-intensity first so intense hotspots sit on top.
    const shown = [...picked].sort((a, b) => a.frp - b.frp);
    const ordered = byFrp;
    const counts = Object.fromEntries(RISK_LEVELS.map((r) => [r, 0])) as Record<RiskLevel, number>;
    for (const d of data.detections) counts[d.risk]++;
    return { shown, total: filtered.length, counts, top: ordered.slice(0, 6) };
  }, [data, visibleRisks, sampling]);

  const region = filters.regionId === "ALL" ? null : REGION_BY_ID[filters.regionId];
  const target = region ? { center: region.center, zoom: region.zoom } : WORLD;

  const toggleRisk = (r: RiskLevel) =>
    setVisibleRisks((s) => {
      const n = new Set(s);
      if (n.has(r)) n.delete(r);
      else n.add(r);
      return n;
    });

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Fire Map"
        title="Hotspot explorer"
        description="Simulated wildfire detections plotted on a dark basemap. Use the top bar to change the date window, region and satellite source; click any marker for its details."
        actions={<DemoBadge label="Simulated points — not live observations" />}
      />

      <Card className="overflow-hidden p-2">
        <div className="relative">
          {status === "error" && !data ? (
            <ErrorState error={error!} onRetry={retry} height={560} />
          ) : !view ? (
            <MapLoading />
          ) : (
            <FireMap detections={view.shown} center={target.center} zoom={target.zoom} height="min(68vh, 640px)" basemap={basemap} />
          )}

          {status === "loading" && data && (
            <div className="pointer-events-none absolute left-1/2 top-3 z-[500] -translate-x-1/2 rounded-full border border-border bg-background/85 px-3 py-1 text-[11px] text-muted backdrop-blur">
              Updating…
            </div>
          )}

          {view && view.total === 0 && (
            <div className="absolute inset-0 z-[500] flex items-center justify-center bg-background/60 p-6 backdrop-blur-sm">
              <div className="w-full max-w-md">
                <EmptyState
                  height={200}
                  message="No simulated detections match the current filters and risk toggles."
                  action={
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        reset();
                        setVisibleRisks(new Set(RISK_LEVELS));
                      }}
                    >
                      Reset all filters
                    </Button>
                  }
                />
              </div>
            </div>
          )}

          {/* Basemap toggle */}
          <div className="absolute right-3 top-3 z-[500]">
            <Segmented
              ariaLabel="Basemap"
              value={basemap}
              onChange={setBasemap}
              className="glass shadow-xl"
              options={[
                { value: "dark", label: "Dark" },
                { value: "satellite", label: "Satellite" },
              ]}
            />
          </div>

          {/* Legend */}
          <div className="glass absolute bottom-6 left-4 z-[500] w-[min(260px,calc(100%-2rem))] rounded-xl border border-border-strong p-3 shadow-xl">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">
              <Layers className="size-3.5" aria-hidden /> Illustrative risk
            </p>
            <ul className="mt-2 space-y-1">
              {RISK_LEVELS.map((r) => {
                const on = visibleRisks.has(r);
                return (
                  <li key={r}>
                    <button
                      type="button"
                      onClick={() => toggleRisk(r)}
                      aria-pressed={on}
                      className={cn(
                        "flex w-full cursor-pointer items-center justify-between rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-white/5",
                        !on && "opacity-40",
                      )}
                    >
                      <span className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full ring-2 ring-[#07111f]" style={{ background: RISK_COLORS[r] }} aria-hidden />
                        {r}
                      </span>
                      <span className="font-mono text-[11px] text-muted">{view ? fmtInt(view.counts[r]) : "—"}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
            <p className="mt-2 border-t border-border pt-2 text-[10.5px] leading-snug text-subtle">
              Marker size ∝ log(FRP). Click a class to hide it. Classes are FRP thresholds, not model predictions.
            </p>
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-muted">
          {view ? (
            <>
              Showing <span className="font-mono text-foreground">{fmtInt(view.shown.length)}</span> of{" "}
              <span className="font-mono text-foreground">{fmtInt(view.total)}</span> simulated detections
              {data && <> · {formatRange(data.range)}</>}
              {view.total > MAX_POINTS && <> · capped at {fmtInt(MAX_POINTS)} for performance</>}
            </>
          ) : (
            "Loading detections…"
          )}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted">Sampling</span>
          <Segmented
            ariaLabel="Point sampling"
            value={sampling}
            onChange={setSampling}
            options={[
              { value: "representative", label: "Representative" },
              { value: "intense", label: "Highest FRP" },
              { value: "recent", label: "Most recent" },
            ]}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <ChartCard className="xl:col-span-2" title="Most intense detections" description="Top simulated hotspots by Fire Radiative Power in the current view">
          {view && view.top.length ? <HotspotTable rows={view.top} /> : <EmptyState height={200} />}
        </ChartCard>
        <ChartCard title="Satellite sources" description="What each sensor contributes" demo={false}>
          <ul className="space-y-3 text-xs">
            {(["MODIS", "VIIRS"] as const).map((s) => (
              <li key={s} className="rounded-lg border border-border bg-surface/60 p-3">
                <p className="flex items-center gap-2 font-medium">
                  <Satellite className="size-3.5" style={{ color: SOURCE_COLORS[s] }} aria-hidden />
                  {s}
                  <span className="text-muted">{s === "MODIS" ? "· Terra & Aqua" : "· Suomi NPP & NOAA-20"}</span>
                </p>
                <p className="mt-1 leading-relaxed text-muted">
                  {s === "MODIS"
                    ? "1 km fire pixels, archive since 2000. Fewer but larger detections — higher FRP per pixel."
                    : "375 m fire pixels, archive since 2012. Detects smaller fires; more detections at lower FRP."}
                </p>
              </li>
            ))}
            <li>
              <Notice>
                Points on this map are generated by the demo dataset to mimic the structure of FIRMS records. Example
                classes: <RiskBadge risk="Low" /> <RiskBadge risk="Extreme" />
              </Notice>
            </li>
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
