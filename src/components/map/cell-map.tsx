"use client";

import "leaflet/dist/leaflet.css";
import { useEffect } from "react";
import { CircleMarker, MapContainer, Rectangle, TileLayer, Tooltip, useMap } from "react-leaflet";
import type { RampName } from "@/lib/ramp";
import type { AreaShape } from "@/lib/harmonized";
import { CellCanvas, type CanvasCell } from "./cell-canvas";
import { AreaDraw, type DrawTool } from "./area-draw";

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

export type MapCell = CanvasCell;
export type { DrawTool };

/** Study region rectangle [latMin, latMax, lonMin, lonMax] (regions.json order). */
export type RegionBox = [number, number, number, number];

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

/**
 * Keeps the study region(s) framed. Leaflet measures its container once, so when the card
 * changes size after mount (window resize, sidebar, layout settling while data loads)
 * the old zoom stays and the region ends up tiny in a corner. Watch the container and
 * re-measure + re-fit on every size change, and fit again when the regions change.
 */
function FitBounds({ boxes }: { boxes: RegionBox[] }) {
  const map = useMap();
  const key = boxes.map((b) => b.join(",")).join(";");
  useEffect(() => {
    if (!boxes.length) return;
    const bounds: [[number, number], [number, number]] = [
      [Math.min(...boxes.map((b) => b[0])), Math.min(...boxes.map((b) => b[2]))],
      [Math.max(...boxes.map((b) => b[1])), Math.max(...boxes.map((b) => b[3]))],
    ];
    const fit = () => {
      const el = map.getContainer();
      if (!el.clientWidth || !el.clientHeight) return; // hidden or not laid out yet
      map.invalidateSize({ animate: false });
      map.fitBounds(bounds, { padding: [24, 24], animate: false });
    };
    fit();

    // setTimeout, not requestAnimationFrame: rAF never fires in background tabs.
    let timer: ReturnType<typeof setTimeout> | undefined;
    const ro = new ResizeObserver(() => {
      clearTimeout(timer);
      timer = setTimeout(fit, 60);
    });
    ro.observe(map.getContainer());
    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [map, key]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const CONF_LABEL: Record<string, string> = { l: "low", n: "nominal", h: "high" };

export default function CellMap({
  cells,
  max,
  boxes,
  basemap = "dark",
  height = 560,
  ramp = "fire",
  area = null,
  onArea,
  tool = null,
  onToolDone,
  highlight,
  live = [],
}: {
  cells: MapCell[];
  max: number;
  /** Study region rectangles to outline and frame. */
  boxes: RegionBox[];
  basemap?: Basemap;
  height?: number | string;
  ramp?: RampName;
  /** The drawn area of interest (editable on the map). */
  area?: AreaShape | null;
  onArea?: (s: AreaShape | null) => void;
  /** Active drawing tool, or null. */
  tool?: DrawTool | null;
  onToolDone?: () => void;
  /** Keys of the cells the area counts (outlined). */
  highlight?: Set<string>;
  /** Near-real-time FIRMS detections, drawn as points on top. */
  live?: LiveHotspot[];
}) {
  const b = BASEMAPS[basemap];
  const c = boxes[0] ?? [0, 0, 0, 0];
  return (
    <MapContainer
      center={[(c[0] + c[1]) / 2, (c[2] + c[3]) / 2]}
      zoom={4}
      minZoom={2}
      scrollWheelZoom
      worldCopyJump
      style={{ height, width: "100%", borderRadius: 12, background: "#07111f" }}
    >
      <TileLayer key={basemap} url={b.url} attribution={b.attribution} maxZoom={b.maxZoom} />
      <FitBounds boxes={boxes} />
      {boxes.map((bx, i) => (
        <Rectangle
          key={i}
          bounds={[
            [bx[0], bx[2]],
            [bx[1], bx[3]],
          ]}
          pathOptions={{ color: "#e7eef8", weight: 1.2, dashArray: "5 5", fill: false, opacity: 0.6 }}
          interactive={false}
        />
      ))}
      <CellCanvas cells={cells} max={max} ramp={ramp} highlight={highlight} />
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
              FRP {h.frp == null ? "—" : `${h.frp.toFixed(1)} MW`} · confidence {CONF_LABEL[h.confidence] ?? h.confidence} ·{" "}
              {h.daynight === "N" ? "night" : "day"}
            </span>
          </Tooltip>
        </CircleMarker>
      ))}
      {onArea && <AreaDraw tool={tool} shape={area} onShape={onArea} onToolDone={onToolDone ?? (() => {})} />}
    </MapContainer>
  );
}
