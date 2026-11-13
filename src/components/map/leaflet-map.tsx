"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { Circle, CircleMarker, MapContainer, Popup, TileLayer, useMap } from "react-leaflet";
import { RISK_COLORS } from "@/lib/colors";
import { REGION_BY_ID } from "@/data/demo/regions";
import { formatDate } from "@/lib/dates";
import type { FireDetection, RegionPrediction } from "@/lib/types";
import { fmtPct } from "@/lib/utils";

export type Basemap = "dark" | "satellite";

const BASEMAPS: Record<Basemap, { url: string; attribution: string; maxZoom: number }> = {
  dark: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}",
    attribution: "Tiles &copy; Esri &mdash; Esri, HERE, Garmin, &copy; OpenStreetMap contributors",
    maxZoom: 16,
  },
  satellite: {
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    attribution: "Imagery &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community",
    maxZoom: 18,
  },
};

function Base({ basemap }: { basemap: Basemap }) {
  const b = BASEMAPS[basemap];
  return <TileLayer key={basemap} url={b.url} attribution={b.attribution} maxZoom={b.maxZoom} />;
}

function FlyTo({ center, zoom }: { center: [number, number]; zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo(center, zoom, { duration: 0.9 });
  }, [map, center[0], center[1], zoom]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-6 py-0.5">
      <span className="text-[#8ea2bf]">{k}</span>
      <span className="font-mono text-[#e7eef8]">{v}</span>
    </div>
  );
}

export interface FireMapProps {
  detections: FireDetection[];
  center: [number, number];
  zoom: number;
  height?: number | string;
  basemap?: Basemap;
}

export default function LeafletFireMap({ detections, center, zoom, height = 560, basemap = "dark" }: FireMapProps) {
  return (
    <MapContainer
      center={center}
      zoom={zoom}
      minZoom={2}
      maxZoom={12}
      worldCopyJump
      preferCanvas
      scrollWheelZoom
      style={{ height, width: "100%" }}
      className="isolate z-0 rounded-xl"
    >
      <Base basemap={basemap} />
      <FlyTo center={center} zoom={zoom} />
      {detections.map((d) => {
        const color = RISK_COLORS[d.risk];
        const radius = Math.min(8.5, 2.5 + Math.log1p(d.frp) * 0.95);
        return (
          <CircleMarker
            key={d.id}
            center={[d.latitude, d.longitude]}
            radius={radius}
            pathOptions={{ color: "#07111f", weight: 1, fillColor: color, fillOpacity: 0.82 }}
          >
            <Popup>
              <div className="min-w-56 text-xs">
                <div className="mb-2 flex items-center justify-between gap-3">
                  <span className="font-semibold text-[13px] text-white">Hotspot {d.id}</span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10.5px] font-medium text-white"
                    style={{ background: `${color}33`, border: `1px solid ${color}88` }}
                  >
                    {d.risk}
                  </span>
                </div>
                <Row k="Region" v={REGION_BY_ID[d.regionId]?.name ?? d.regionId} />
                <Row k="Acquired" v={`${formatDate(d.acq_date)} · ${d.acq_time.slice(0, 2)}:${d.acq_time.slice(2)} UTC`} />
                <Row k="Sensor" v={`${d.source} · ${d.satellite}`} />
                <Row k="FRP" v={`${d.frp} MW`} />
                <Row k="Brightness" v={`${d.brightness} K`} />
                <Row k="Confidence" v={d.confidence} />
                <Row k="Lat / Lon" v={`${d.latitude.toFixed(3)}, ${d.longitude.toFixed(3)}`} />
                <p className="mt-2 border-t border-white/10 pt-2 text-[10.5px] leading-snug text-[#f3c48a]">
                  Simulated demo point — not an actual satellite observation.
                </p>
              </div>
            </Popup>
          </CircleMarker>
        );
      })}
    </MapContainer>
  );
}

export function LeafletPredictionMap({
  predictions,
  height = 420,
  onSelect,
}: {
  predictions: RegionPrediction[];
  height?: number | string;
  onSelect?: (regionId: string) => void;
}) {
  return (
    <MapContainer center={[15, 20]} zoom={2} minZoom={1} worldCopyJump scrollWheelZoom={false} style={{ height, width: "100%" }} className="isolate z-0 rounded-xl">
      <Base basemap="dark" />
      {predictions.map((p) => {
        const r = REGION_BY_ID[p.regionId];
        if (!r) return null;
        const color = RISK_COLORS[p.risk];
        return (
          <Circle
            key={p.regionId}
            center={r.center}
            radius={250_000 + p.probability * 550_000}
            pathOptions={{ color, weight: 1.5, fillColor: color, fillOpacity: 0.28 }}
            eventHandlers={onSelect ? { click: () => onSelect(p.regionId) } : undefined}
          >
            <Popup>
              <div className="min-w-52 text-xs">
                <p className="mb-2 text-[13px] font-semibold text-white">
                  {r.name}, {r.country}
                </p>
                <Row k="Simulated risk" v={p.risk} />
                <Row k="P(elevated activity)" v={fmtPct(p.probability)} />
                <Row k="Expected detections" v={`${p.expectedLow}–${p.expectedHigh}`} />
                <p className="mt-2 border-t border-white/10 pt-2 text-[10.5px] text-[#f3c48a]">Simulated output — not a real forecast.</p>
              </div>
            </Popup>
          </Circle>
        );
      })}
    </MapContainer>
  );
}
