"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { MapContainer, Rectangle, TileLayer, Tooltip, useMap } from "react-leaflet";
import { rampColor } from "@/components/charts/harmonized-charts";
import { fmtInt } from "@/lib/utils";
import type { Basemap } from "./leaflet-map";

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

export interface MapCell {
  /** [latMin, lonMin, latMax, lonMax] */
  bounds: [number, number, number, number];
  value: number;
  label: string;
}

/**
 * Keeps the study region framed. Leaflet measures its container once, so when the card
 * changes size after mount (window resize, sidebar, layout settling while data loads)
 * the old zoom stays and the region ends up tiny in a corner. Watch the container and
 * re-measure + re-fit on every size change, and fit again when the region changes.
 */
function FitBounds({ bbox }: { bbox: [number, number, number, number] }) {
  const map = useMap();
  useEffect(() => {
    const bounds: [[number, number], [number, number]] = [
      [bbox[0], bbox[2]],
      [bbox[1], bbox[3]],
    ];
    const fit = (animate: boolean) => {
      const el = map.getContainer();
      if (!el.clientWidth || !el.clientHeight) return; // hidden or not laid out yet
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { padding: [24, 24], animate });
    };
    fit(false);

    // setTimeout, not requestAnimationFrame: rAF never fires in background tabs.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(() => fit(false), 60);
    });
    ro.observe(map.getContainer());
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [map, bbox[0], bbox[1], bbox[2], bbox[3]]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function CellMap({
  cells,
  max,
  bbox,
  basemap = "dark",
  height = 560,
}: {
  cells: MapCell[];
  max: number;
  /** Study region [latMin, latMax, lonMin, lonMax] */
  bbox: [number, number, number, number];
  basemap?: Basemap;
  height?: number | string;
}) {
  const b = BASEMAPS[basemap];
  const t = (v: number) => (max > 0 ? Math.log1p(v) / Math.log1p(max) : 0);
  return (
    <MapContainer
      center={[(bbox[0] + bbox[1]) / 2, (bbox[2] + bbox[3]) / 2]}
      zoom={6}
      preferCanvas
      scrollWheelZoom
      worldCopyJump
      style={{ height, width: "100%", borderRadius: 12, background: "#07111f" }}
    >
      <TileLayer key={basemap} url={b.url} attribution={b.attribution} maxZoom={b.maxZoom} />
      <FitBounds bbox={bbox} />
      <Rectangle
        bounds={[
          [bbox[0], bbox[2]],
          [bbox[1], bbox[3]],
        ]}
        pathOptions={{ color: "#e7eef8", weight: 1.2, dashArray: "5 5", fill: false, opacity: 0.6 }}
        interactive={false}
      />
      {cells.map((c, i) => (
        <Rectangle
          key={i}
          bounds={[
            [c.bounds[0], c.bounds[1]],
            [c.bounds[2], c.bounds[3]],
          ]}
          pathOptions={{ stroke: false, fillColor: rampColor(0.15 + 0.85 * t(c.value)), fillOpacity: 0.78 }}
        >
          <Tooltip sticky>
            <span className="font-mono text-xs">
              {fmtInt(c.value)} detections · {c.label}
            </span>
          </Tooltip>
        </Rectangle>
      ))}
    </MapContainer>
  );
}
