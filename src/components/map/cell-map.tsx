"use client";

import "leaflet/dist/leaflet.css";
import { useEffect, useRef, useState } from "react";
import { CircleMarker, MapContainer, Rectangle, TileLayer, Tooltip, useMap, useMapEvents } from "react-leaflet";
import type { LatLng } from "leaflet";
import { rampColor, type RampName } from "@/lib/ramp";
import type { AreaBox } from "@/lib/harmonized";
import { fmtInt } from "@/lib/utils";

/** Kept here (not imported from leaflet-map) so this chunk doesn't pull in the demo map. */
export type Basemap = "dark" | "satellite";

export interface LiveHotspot {
  lat: number;
  lon: number;
  date: string;
  time: string;
  frp: number | null;
  confidence: string;
  daynight: string;
  satellite: string;
}

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

/**
 * Drag a rectangle on the map (while `active`): map panning is paused, mouse-down sets one corner,
 * mouse-up the other. Touch works through Leaflet's pointer emulation.
 */
function DrawBox({ active, onDone }: { active: boolean; onDone: (box: AreaBox) => void }) {
  const map = useMap();
  const start = useRef<LatLng | null>(null);
  const [preview, setPreview] = useState<[[number, number], [number, number]] | null>(null);

  useEffect(() => {
    const el = map.getContainer();
    if (active) {
      map.dragging.disable();
      el.style.cursor = "crosshair";
    } else {
      map.dragging.enable();
      el.style.cursor = "";
      start.current = null;
      setPreview(null);
    }
    return () => {
      map.dragging.enable();
      el.style.cursor = "";
    };
  }, [active, map]);

  useMapEvents({
    mousedown(e) {
      if (!active) return;
      start.current = e.latlng;
      setPreview([
        [e.latlng.lat, e.latlng.lng],
        [e.latlng.lat, e.latlng.lng],
      ]);
    },
    mousemove(e) {
      if (!active || !start.current) return;
      setPreview([
        [start.current.lat, start.current.lng],
        [e.latlng.lat, e.latlng.lng],
      ]);
    },
    mouseup(e) {
      if (!active || !start.current) return;
      const a = start.current;
      start.current = null;
      setPreview(null);
      const box: AreaBox = [
        Math.min(a.lat, e.latlng.lat),
        Math.min(a.lng, e.latlng.lng),
        Math.max(a.lat, e.latlng.lat),
        Math.max(a.lng, e.latlng.lng),
      ];
      // A click without a drag is not an area.
      if (box[2] - box[0] > 0.02 && box[3] - box[1] > 0.02) onDone(box);
    },
  });

  return preview ? (
    <Rectangle bounds={preview} pathOptions={{ color: "#2fd3a4", weight: 1.5, dashArray: "4 4", fillOpacity: 0.08 }} interactive={false} />
  ) : null;
}

const CONF_LABEL: Record<string, string> = { l: "low", n: "nominal", h: "high" };

export default function CellMap({
  cells,
  max,
  bbox,
  basemap = "dark",
  height = 560,
  ramp = "fire",
  area = null,
  drawing = false,
  onAreaDrawn,
  live = [],
}: {
  cells: MapCell[];
  max: number;
  /** Study region [latMin, latMax, lonMin, lonMax] */
  bbox: [number, number, number, number];
  basemap?: Basemap;
  height?: number | string;
  ramp?: RampName;
  /** User-selected area [latMin, lonMin, latMax, lonMax], outlined on the map. */
  area?: AreaBox | null;
  drawing?: boolean;
  onAreaDrawn?: (box: AreaBox) => void;
  /** Near-real-time FIRMS detections, drawn as points on top. */
  live?: LiveHotspot[];
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
          pathOptions={{ stroke: false, fillColor: rampColor(0.15 + 0.85 * t(c.value), ramp), fillOpacity: 0.78 }}
        >
          <Tooltip sticky>
            <span className="font-mono text-xs">
              {fmtInt(c.value)} detections · {c.label}
            </span>
          </Tooltip>
        </Rectangle>
      ))}
      {area && (
        <Rectangle
          bounds={[
            [area[0], area[1]],
            [area[2], area[3]],
          ]}
          pathOptions={{ color: "#2fd3a4", weight: 2, fill: false }}
          interactive={false}
        />
      )}
      {live.map((h, i) => (
        <CircleMarker
          key={`${h.lat},${h.lon},${h.date}${h.time},${i}`}
          center={[h.lat, h.lon]}
          radius={Math.min(9, 3 + Math.sqrt(h.frp ?? 0) / 2.5)}
          pathOptions={{ color: "#ffffff", weight: 1, fillColor: "#ff3b30", fillOpacity: h.confidence === "l" ? 0.45 : 0.9 }}
        >
          <Tooltip>
            <span className="font-mono text-xs">
              {h.date} {h.time.slice(0, 2)}:{h.time.slice(2)} UTC · {h.satellite}
              <br />
              FRP {h.frp == null ? "—" : `${h.frp.toFixed(1)} MW`} · confidence {CONF_LABEL[h.confidence] ?? h.confidence} · {h.daynight === "N" ? "night" : "day"}
            </span>
          </Tooltip>
        </CircleMarker>
      ))}
      {onAreaDrawn && <DrawBox active={drawing} onDone={onAreaDrawn} />}
    </MapContainer>
  );
}
