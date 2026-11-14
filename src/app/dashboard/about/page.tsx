import type { Metadata } from "next";
import { AlertTriangle, CheckCircle2, Database, Satellite, Server, Target } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Notice, PageHeader } from "@/components/dashboard/primitives";
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
  "Before 2013 the record is a model estimate. Fires too small for MODIS to see at all can only be added back on average, not located individually.",
  "The model is calibrated per region. On a region it has never seen, with a different fire type, its totals can be off by 50% or more.",
];

export default function AboutPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="About & Methodology"
        title="How FireBridge works"
        description="A research prototype for the NASA Space Apps Challenge 2026: one consistent fire record from MODIS (2000–) and VIIRS (2012–), so fire trends can be read across the 2012 sensor switch."
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
          detection confidence and a day/night flag. We use the yearly country archives for MODIS Collection 6.1 and VIIRS
          Suomi NPP 375 m.
        </Notice>
      </section>

      <section aria-labelledby="target" className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle id="target" className="flex items-center gap-2 text-base">
              <Target className="size-4 text-fire" aria-hidden /> What we predict
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm leading-relaxed text-muted">
            <p>
              For every 10 × 10 km cell and month, the number of fire detections <span className="text-foreground">VIIRS would have
              made</span>, predicted from what MODIS saw. Where both sensors exist (2013–2024) we can check the prediction against
              the real VIIRS count; for 2000–2012 it rebuilds the record on the VIIRS scale.
            </p>
            <p>
              The model is a per-region VIIRS/MODIS ratio multiplied by a correction learned with gradient-boosted trees, trained
              on 2013–2020, tuned on 2021 and tested once on 2022–2024.
            </p>
            <ul className="space-y-1.5">
              {[
                "7 study regions on 5 continents, 7 fire types",
                "Vegetation fires only (FIRMS type 0)",
                "5-model ensemble for an uncertainty band",
                "Checked against documented fire events",
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
              Five Python notebooks run on Google Colab: download the FIRMS archive, clean it, grid it, train the harmonization
              model on a GPU, and export the results as static JSON.
            </p>
            <ul className="space-y-1.5 font-mono text-xs">
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> /data/regions.json</li>
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> /data/calendar_&lt;region&gt;.json</li>
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> /data/cells/&lt;region&gt;/&lt;year&gt;.json</li>
              <li className="flex items-center gap-2"><Database className="size-3.5 text-subtle" aria-hidden /> /data/model.json</li>
            </ul>
            <p>
              This Next.js + TypeScript app reads those files directly, so it needs no backend and is hosted on Vercel. Code and
              notebooks: github.com/Yosef392/FireBridge.
            </p>
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
              <Notice tone="info">
                This application is a hackathon research prototype built on NASA FIRMS data. It is not an operational fire-warning
                system — always follow official guidance from local fire and emergency authorities.
              </Notice>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
