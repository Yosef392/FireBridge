import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Database, Satellite, Server, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoBadge, Notice, PageHeader } from "@/components/dashboard/primitives";
import { Pipeline } from "@/components/landing/pipeline";

export const metadata: Metadata = { title: "About & Methodology" };

const SENSORS = [
  {
    name: "MODIS",
    full: "Moderate Resolution Imaging Spectroradiometer",
    platforms: "Terra (2000–) & Aqua (2002–)",
    rows: [
      ["Fire pixel size", "~1 km at nadir"],
      ["Overpasses", "~4 per day (two satellites)"],
      ["Archive", "Nov 2000 → present"],
      ["Strength", "Longest consistent record for trend analysis"],
    ],
  },
  {
    name: "VIIRS",
    full: "Visible Infrared Imaging Radiometer Suite",
    platforms: "Suomi NPP (2012–), NOAA-20 (2018–), NOAA-21",
    rows: [
      ["Fire pixel size", "375 m (I-band)"],
      ["Overpasses", "~2 per satellite per day"],
      ["Archive", "Jan 2012 → present"],
      ["Strength", "Detects smaller, cooler fires; better spatial detail"],
    ],
  },
];

const LIMITATIONS = [
  "Detections are thermal anomalies, not confirmed wildfires: agricultural burns, industrial heat sources and gas flares can appear in the record.",
  "Cloud and smoke cover, satellite overpass timing and dense canopy can cause fires to be missed entirely.",
  "MODIS and VIIRS differ in resolution and sensitivity; mixing them without harmonisation inflates counts where VIIRS dominates.",
  "Fire Radiative Power is an instantaneous measurement at overpass time and is not a direct measure of burned area or damage.",
  "A model trained on historical patterns can under-react to unprecedented conditions (record heat, new land use, policy changes).",
  "Predicted probabilities express relative likelihood of elevated activity; they are not ignition forecasts or evacuation guidance.",
];

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="About & Methodology"
        title="How FireBridge works"
        description="An end-to-end research prototype: from raw satellite fire detections to an interpretable, region-level outlook for elevated fire activity."
        actions={<DemoBadge label="Prototype · Demo data" />}
      />

      <section aria-labelledby="workflow" className="space-y-4">
        <h2 id="workflow" className="font-display text-lg font-semibold">Workflow</h2>
        <Pipeline compact />
      </section>

      <section aria-labelledby="sources" className="space-y-4">
        <h2 id="sources" className="flex items-center gap-2 font-display text-lg font-semibold">
          <Satellite className="size-5 text-accent" aria-hidden /> Data sources
        </h2>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {SENSORS.map((s) => (
            <Card key={s.name}>
              <CardHeader>
                <div>
                  <CardTitle className="text-lg">{s.name}</CardTitle>
                  <CardDescription>
                    {s.full} · {s.platforms}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <dl className="divide-y divide-border text-sm">
                  {s.rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 py-2">
                      <dt className="text-muted">{k}</dt>
                      <dd className="text-right">{v}</dd>
                    </div>
                  ))}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>
        <Notice tone="info">
          Both products are distributed by NASA’s Fire Information for Resource Management System (FIRMS). Each record
          carries latitude, longitude, acquisition date/time, brightness temperature, Fire Radiative Power (FRP),
          detection confidence and a day/night flag — the same fields this application’s data model uses.
        </Notice>
      </section>

      <section aria-labelledby="target" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="target" className="flex items-center gap-2 text-base">
              <Target className="size-4 text-fire" aria-hidden /> Prediction target: Elevated Fire Activity
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              For each region and forecast horizon (7, 14 or 30 days), the model estimates the probability that the number
              of active-fire detections will exceed that region’s historical <span className="text-foreground">75th percentile</span> for
              the same time of year.
            </p>
            <p>
              Framing the problem as “elevated vs. normal” activity — rather than predicting individual ignitions — matches what
              satellite data can support and gives decision-makers a comparable, region-normalised signal.
            </p>
            <ul className="space-y-1.5">
              {[
                "Low: P < 25%",
                "Moderate: 25–50%",
                "High: 50–75%",
                "Extreme: ≥ 75%",
              ].map((t) => (
                <li key={t} className="flex items-center gap-2 text-xs">
                  <CheckCircle2 className="size-3.5 text-success" aria-hidden /> {t}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Server className="size-4 text-primary" aria-hidden /> Architecture & integration
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              The web app is a Next.js + TypeScript front end. All data flows through a single typed client
              (<code className="font-mono text-xs text-foreground">src/lib/api/client.ts</code>), which today serves the bundled demo
              archive and, with <code className="font-mono text-xs text-foreground">NEXT_PUBLIC_DATA_MODE=api</code>, calls the Python FastAPI
              backend instead.
            </p>
            <ul className="space-y-1.5 font-mono text-xs">
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> GET /api/v1/regions</li>
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> GET /api/v1/detections?preset=&amp;region=&amp;source=</li>
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> GET /api/v1/predictions</li>
            </ul>
            <p>No NASA API is called from the browser and no real-time predictions are produced in this prototype.</p>
          </CardContent>
        </Card>
      </section>

      <section aria-labelledby="limits">
        <Card className="border-fire-soft/25">
          <CardHeader>
            <CardTitle id="limits" className="flex items-center gap-2 text-base">
              <AlertTriangle className="size-4 text-fire-soft" aria-hidden /> Limitations & responsible interpretation
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {LIMITATIONS.map((l) => (
                <li key={l} className="flex gap-2.5 rounded-xl border border-border bg-surface/50 p-3 text-xs leading-relaxed text-muted">
                  <span className="mt-1 size-1.5 shrink-0 rounded-full bg-fire-soft" aria-hidden />
                  {l}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <Notice>
                This application is a hackathon research prototype. All data currently shown is illustrative. It is not an
                operational fire-warning system — always follow official guidance from local fire and emergency authorities.
              </Notice>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
