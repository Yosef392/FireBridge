"use client";

import { useEffect, useRef } from "react";
import { geoGraticule10, geoOrthographic, geoPath, geoDistance } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import landTopo from "world-atlas/land-110m.json";

/** Centres and sizes of the 7 FireBridge study regions (from public/data/regions.json). */
const STUDY_REGIONS = [
  { center: [10.5, -9.2] as [number, number], spread: [4.0, 3.2] as [number, number] },
  { center: [40.1, -7.9] as [number, number], spread: [1.8, 2.2] as [number, number] },
  { center: [62.0, -117.5] as [number, number], spread: [4.0, 15.0] as [number, number] },
  { center: [-32.85, 147.3] as [number, number], spread: [9.5, 12.8] as [number, number] },
  { center: [-16.75, -56.6] as [number, number], spread: [2.5, 3.2] as [number, number] },
  { center: [-1.35, 113.3] as [number, number], spread: [4.5, 5.2] as [number, number] },
  { center: [30.925, 31.4] as [number, number], spread: [1.45, 1.8] as [number, number] },
];

/**
 * Decorative rotating Earth with glowing clusters at the 7 study regions
 * (the sparks inside each region are decorative, not individual fires).
 */

type Spark = { lon: number; lat: number; r: number; phase: number; hot: boolean };

function makeSparks(): Spark[] {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const out: Spark[] = [];
  for (const reg of STUDY_REGIONS) {
    for (let i = 0; i < 14; i++) {
      out.push({
        lat: reg.center[0] + (rand() - 0.5) * Math.max(2, reg.spread[0]),
        lon: reg.center[1] + (rand() - 0.5) * Math.max(2, reg.spread[1]),
        r: 0.6 + rand() * 1.8,
        phase: rand() * Math.PI * 2,
        hot: rand() > 0.55,
      });
    }
  }
  return out;
}

export function EarthGlobe({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const topo = landTopo as unknown as Topology<{ land: GeometryCollection }>;
    const land = feature(topo, topo.objects.land);
    const graticule = geoGraticule10();
    const sparks = makeSparks();
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let size = 0;
    let dpr = 1;
    const projection = geoOrthographic().clipAngle(90).precision(0.6);
    const path = geoPath(projection, ctx);

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      size = rect.width;
      canvas.width = size * dpr;
      canvas.height = size * dpr;
      projection.translate([size / 2, size / 2]).scale(size * 0.42);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);

    let raf = 0;
    let lon = -20;
    let last = performance.now();

    const draw = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      if (!reduce) lon += dt * 0.006;
      projection.rotate([lon, -14, 0]);
      const t = now / 1000;
      const R = projection.scale();
      const cx = size / 2;
      const cy = size / 2;

      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, size, size);

      // Atmosphere glow
      const glow = ctx.createRadialGradient(cx, cy, R * 0.92, cx, cy, R * 1.22);
      glow.addColorStop(0, "rgba(76,158,255,0.35)");
      glow.addColorStop(0.4, "rgba(76,158,255,0.10)");
      glow.addColorStop(1, "rgba(76,158,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(cx, cy, R * 1.22, 0, Math.PI * 2);
      ctx.fill();

      // Ocean sphere
      const ocean = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      ocean.addColorStop(0, "#14345a");
      ocean.addColorStop(0.65, "#0a1d36");
      ocean.addColorStop(1, "#050f1e");
      ctx.fillStyle = ocean;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Graticule
      ctx.beginPath();
      path(graticule);
      ctx.strokeStyle = "rgba(120,170,230,0.10)";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Land
      ctx.beginPath();
      path(land);
      const landFill = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
      landFill.addColorStop(0, "#2a5180");
      landFill.addColorStop(1, "#173556");
      ctx.fillStyle = landFill;
      ctx.fill();
      ctx.strokeStyle = "rgba(140,195,255,0.35)";
      ctx.lineWidth = 0.6;
      ctx.stroke();

      // Hotspots
      const center: [number, number] = [-lon, 14];
      for (const s of sparks) {
        if (geoDistance([s.lon, s.lat], center) > Math.PI / 2 - 0.05) continue;
        const p = projection([s.lon, s.lat]);
        if (!p) continue;
        const pulse = 0.55 + 0.45 * Math.sin(t * 2.2 + s.phase);
        const rr = (s.r + (s.hot ? 1.2 : 0)) * (size / 520);
        const g = ctx.createRadialGradient(p[0], p[1], 0, p[0], p[1], rr * 7);
        g.addColorStop(0, s.hot ? `rgba(255,90,60,${0.55 * pulse})` : `rgba(255,170,70,${0.4 * pulse})`);
        g.addColorStop(1, "rgba(255,90,60,0)");
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p[0], p[1], rr * 7, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = s.hot ? "#ffd2a8" : "#ffb347";
        ctx.beginPath();
        ctx.arc(p[0], p[1], rr, 0, Math.PI * 2);
        ctx.fill();
      }

      // Terminator shading for depth
      const shade = ctx.createRadialGradient(cx - R * 0.5, cy - R * 0.5, R * 0.2, cx, cy, R * 1.05);
      shade.addColorStop(0, "rgba(0,0,0,0)");
      shade.addColorStop(1, "rgba(2,8,18,0.55)");
      ctx.fillStyle = shade;
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fill();

      // Rim light
      ctx.beginPath();
      ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(92,225,230,0.35)";
      ctx.lineWidth = 1;
      ctx.stroke();

      // Orbit + satellite
      const orbitA = R * 1.32;
      const orbitB = R * 0.42;
      const tilt = -0.42;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(tilt);
      ctx.beginPath();
      ctx.ellipse(0, 0, orbitA, orbitB, 0, 0, Math.PI * 2);
      ctx.strokeStyle = "rgba(76,158,255,0.28)";
      ctx.setLineDash([3, 6]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      const a = (reduce ? 0.6 : t * 0.45) % (Math.PI * 2);
      const sx = Math.cos(a) * orbitA;
      const sy = Math.sin(a) * orbitB;
      const behind = Math.sin(a) < 0 && Math.hypot(sx, sy) < R;
      if (!behind) {
        // scan beam toward Earth
        const beam = ctx.createLinearGradient(sx, sy, sx * 0.55, sy * 0.55);
        beam.addColorStop(0, "rgba(92,225,230,0.45)");
        beam.addColorStop(1, "rgba(92,225,230,0)");
        ctx.fillStyle = beam;
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        const nx = -sy * 0.08;
        const ny = sx * 0.08;
        ctx.lineTo(sx * 0.55 + nx, sy * 0.55 + ny);
        ctx.lineTo(sx * 0.55 - nx, sy * 0.55 - ny);
        ctx.closePath();
        ctx.fill();
        ctx.fillStyle = "#e7f6ff";
        ctx.fillRect(sx - 3, sy - 2, 6, 4);
        ctx.fillStyle = "#4c9eff";
        ctx.fillRect(sx - 11, sy - 1.5, 6, 3);
        ctx.fillRect(sx + 5, sy - 1.5, 6, 3);
      }
      ctx.restore();

      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);

  return <canvas ref={canvasRef} className={className} style={{ aspectRatio: "1 / 1", width: "100%" }} aria-hidden />;
}
