"use client";

import { useEffect, useRef } from "react";
import L from "leaflet";
import { useMap } from "react-leaflet";
import { rampColor, type RampName } from "@/lib/ramp";
import { fmtInt } from "@/lib/utils";

export interface CanvasCell {
  /** Unique across regions, e.g. "Australia_NSW:1203". */
  key: string;
  /** [latMin, lonMin, latMax, lonMax] */
  bounds: [number, number, number, number];
  value: number;
  label: string;
}

/** Cells in 1° buckets, so hover finds the cell under the mouse without scanning all of them. */
function bucketIndex(cells: CanvasCell[]) {
  const m = new Map<number, CanvasCell[]>();
  const k = (lat: number, lon: number) => lat * 1000 + lon;
  for (const c of cells) {
    for (let la = Math.floor(c.bounds[0]); la <= Math.floor(c.bounds[2]); la++)
      for (let lo = Math.floor(c.bounds[1]); lo <= Math.floor(c.bounds[3]); lo++) {
        const key = k(la, lo);
        const list = m.get(key);
        if (list) list.push(c);
        else m.set(key, [c]);
      }
  }
  return (lat: number, lon: number) =>
    (m.get(k(Math.floor(lat), Math.floor(lon))) ?? []).find(
      (c) => lat >= c.bounds[0] && lat <= c.bounds[2] && lon >= c.bounds[1] && lon <= c.bounds[3],
    ) ?? null;
}

/**
 * All grid cells drawn on one canvas. Thousands of separate SVG/React rectangles (every region at once
 * is ~11,000 cells) make the map crawl; one canvas redrawn after each pan/zoom stays fast. Cells smaller
 * than 2 px (zoomed far out) are drawn as 2 px dots so a region never disappears. Cells in `highlight`
 * (the ones a drawn area counts) get a white outline.
 */
export function CellCanvas({
  cells,
  max,
  ramp,
  highlight,
}: {
  cells: CanvasCell[];
  max: number;
  ramp: RampName;
  highlight?: Set<string>;
}) {
  const map = useMap();
  const state = useRef({ cells, max, ramp, highlight });
  state.current = { cells, max, ramp, highlight };
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    const canvas = L.DomUtil.create("canvas", "leaflet-zoom-hide") as HTMLCanvasElement;
    canvas.style.pointerEvents = "none";
    map.getPanes().overlayPane.appendChild(canvas);
    const ctx = canvas.getContext("2d")!;
    let find = bucketIndex(state.current.cells);
    let lastCells = state.current.cells;

    const redraw = () => {
      const { cells: cs, max: mx, ramp: rp, highlight: hl } = state.current;
      if (cs !== lastCells) {
        find = bucketIndex(cs);
        lastCells = cs;
      }
      const size = map.getSize();
      const dpr = window.devicePixelRatio || 1;
      canvas.width = size.x * dpr;
      canvas.height = size.y * dpr;
      canvas.style.width = `${size.x}px`;
      canvas.style.height = `${size.y}px`;
      L.DomUtil.setPosition(canvas, map.containerPointToLayerPoint([0, 0]));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size.x, size.y);
      const t = (v: number) => (mx > 0 ? Math.log1p(v) / Math.log1p(mx) : 0);
      ctx.globalAlpha = 0.8;
      const outlined: [number, number, number, number][] = [];
      for (const c of cs) {
        const nw = map.latLngToContainerPoint([c.bounds[2], c.bounds[1]]);
        const se = map.latLngToContainerPoint([c.bounds[0], c.bounds[3]]);
        let w = se.x - nw.x;
        let h = se.y - nw.y;
        let x = nw.x;
        let y = nw.y;
        if (w < 2) {
          x -= (2 - w) / 2;
          w = 2;
        }
        if (h < 2) {
          y -= (2 - h) / 2;
          h = 2;
        }
        if (x > size.x || y > size.y || x + w < 0 || y + h < 0) continue;
        ctx.fillStyle = rampColor(0.15 + 0.85 * t(c.value), rp);
        ctx.fillRect(x, y, w, h);
        if (hl?.has(c.key)) outlined.push([x, y, w, h]);
      }
      if (outlined.length) {
        ctx.globalAlpha = 0.95;
        ctx.strokeStyle = "#ffffff";
        ctx.lineWidth = 1;
        for (const [x, y, w, h] of outlined) ctx.strokeRect(x + 0.5, y + 0.5, Math.max(1, w - 1), Math.max(1, h - 1));
      }
      ctx.globalAlpha = 1;
    };
    redrawRef.current = redraw;

    // One shared tooltip for whichever cell is under the mouse.
    const tip = L.tooltip({ direction: "top", offset: [0, -6], className: "font-mono text-xs" });
    const onMove = (e: L.LeafletMouseEvent) => {
      const c = find(e.latlng.lat, e.latlng.lng);
      if (!c) {
        map.closeTooltip(tip);
        return;
      }
      tip.setLatLng(e.latlng).setContent(`${fmtInt(c.value)} detections · ${c.label}`);
      if (!map.hasLayer(tip)) map.openTooltip(tip);
    };
    const onOut = () => map.closeTooltip(tip);

    map.on("moveend zoomend resize viewreset", redraw);
    map.on("mousemove", onMove);
    map.on("mouseout", onOut);
    redraw();
    return () => {
      map.off("moveend zoomend resize viewreset", redraw);
      map.off("mousemove", onMove);
      map.off("mouseout", onOut);
      map.closeTooltip(tip);
      canvas.remove();
    };
  }, [map]);

  // New data, colours or highlight: just repaint.
  useEffect(() => {
    redrawRef.current();
  }, [cells, max, ramp, highlight]);

  return null;
}
