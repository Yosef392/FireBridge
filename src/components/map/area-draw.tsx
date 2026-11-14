"use client";

import "@geoman-io/leaflet-geoman-free";
import "@geoman-io/leaflet-geoman-free/dist/leaflet-geoman.css";
import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { shapeBounds, type AreaShape } from "@/lib/harmonized";

export type DrawTool = "rect" | "polygon" | "circle";

const GEOMAN_SHAPE: Record<DrawTool, "Rectangle" | "Polygon" | "Circle"> = { rect: "Rectangle", polygon: "Polygon", circle: "Circle" };
const STYLE: L.PathOptions = { color: "#2fd3a4", weight: 2, fillColor: "#2fd3a4", fillOpacity: 0.06 };

/** Leaflet layer → our plain shape object. */
function toShape(layer: L.Layer): AreaShape | null {
  if (layer instanceof L.Circle) {
    const c = layer.getLatLng();
    return { kind: "circle", center: [c.lat, c.lng], radiusKm: layer.getRadius() / 1000 };
  }
  if (layer instanceof L.Rectangle) {
    const b = layer.getBounds();
    return { kind: "rect", box: [b.getSouth(), b.getWest(), b.getNorth(), b.getEast()] };
  }
  if (layer instanceof L.Polygon) {
    const ring = (layer.getLatLngs()[0] ?? []) as L.LatLng[];
    return ring.length >= 3 ? { kind: "polygon", points: ring.map((p) => [p.lat, p.lng]) } : null;
  }
  return null;
}

function toLayer(s: AreaShape): L.Layer {
  if (s.kind === "circle") return L.circle(s.center, { ...STYLE, radius: s.radiusKm * 1000 });
  if (s.kind === "rect")
    return L.rectangle(
      [
        [s.box[0], s.box[1]],
        [s.box[2], s.box[3]],
      ],
      STYLE,
    );
  return L.polygon(s.points, STYLE);
}

const same = (a: AreaShape | null, b: AreaShape | null) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Draw an area of interest and keep it editable, using Leaflet-Geoman:
 * - `tool` set: draw a rectangle (click one corner, then the opposite one), polygon (click points, click
 *   the first point or double-click to close) or circle (click the centre, then click at the radius).
 *   Works with mouse and touch. Esc cancels.
 * - the finished shape stays on the map with handles: drag a corner/vertex to reshape, drag the shape
 *   (or a circle's centre) to move it, drag the circle's edge to change the radius.
 * Every change is reported through `onShape`; a shape set from outside (typed coordinates, a shared
 * link) is drawn the same way and the map zooms to it.
 */
export function AreaDraw({
  tool,
  shape,
  onShape,
  onToolDone,
}: {
  tool: DrawTool | null;
  shape: AreaShape | null;
  onShape: (s: AreaShape | null) => void;
  onToolDone: () => void;
}) {
  const map = useMap();
  const layerRef = useRef<L.Layer | null>(null);
  const emitted = useRef<AreaShape | null>(null);
  const cb = useRef({ onShape, onToolDone });
  cb.current = { onShape, onToolDone };

  // Geoman setup + "shape finished" handler.
  useEffect(() => {
    map.pm.setGlobalOptions({ snappable: false, continueDrawing: false, pathOptions: STYLE, templineStyle: STYLE, hintlineStyle: { ...STYLE, dashArray: "4 4" } });
    const onCreate = (e: { layer: L.Layer }) => {
      const s = toShape(e.layer);
      e.layer.remove(); // redrawn below as our own editable layer
      cb.current.onToolDone();
      // Not marked as "emitted": a newly drawn shape replaces the previous layer like any outside change.
      if (s) cb.current.onShape(s);
    };
    map.on("pm:create", onCreate);
    return () => {
      map.off("pm:create", onCreate);
      map.pm.disableDraw();
    };
  }, [map]);

  // Draw mode follows `tool`.
  useEffect(() => {
    map.pm.disableDraw();
    if (!tool) return;
    map.pm.enableDraw(GEOMAN_SHAPE[tool], { snappable: false, continueDrawing: false, finishOn: tool === "polygon" ? "dblclick" : null });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        map.pm.disableDraw();
        cb.current.onToolDone();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [map, tool]);

  // The current shape as an editable layer.
  useEffect(() => {
    const fromOutside = !same(shape, emitted.current);
    // A change that came from editing this very layer: keep it (and its handles) as they are.
    if (!fromOutside && (layerRef.current || !shape)) return;
    emitted.current = shape;
    if (layerRef.current) {
      layerRef.current.off("pm:edit pm:dragend");
      layerRef.current.remove();
      layerRef.current = null;
    }
    if (!shape) return;
    const layer = toLayer(shape);
    layer.addTo(map);
    const pm = (layer as L.Layer & { pm: { enable: (o: object) => void } }).pm;
    pm.enable({ draggable: true, allowSelfIntersection: false });
    layer.on("pm:edit pm:dragend", () => {
      const s = toShape(layer);
      if (s) {
        emitted.current = s;
        cb.current.onShape(s);
      }
    });
    layerRef.current = layer;
    const b = shapeBounds(shape);
    map.fitBounds(
      [
        [b[0], b[1]],
        [b[2], b[3]],
      ],
      { padding: [40, 40], maxZoom: 9 },
    );
  }, [map, shape]);

  useEffect(
    () => () => {
      layerRef.current?.remove();
    },
    [],
  );

  return null;
}
