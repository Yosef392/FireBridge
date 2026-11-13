"use client";

import { Moon, Sun } from "lucide-react";
import { RiskBadge } from "./primitives";
import { REGION_BY_ID } from "@/data/demo/regions";
import { formatDate } from "@/lib/dates";
import type { FireDetection } from "@/lib/types";
import { cn } from "@/lib/utils";
import { SOURCE_COLORS } from "@/lib/colors";

export function HotspotTable({ rows, className }: { rows: FireDetection[]; className?: string }) {
  return (
    <div className={cn("scrollbar-thin overflow-x-auto", className)}>
      <table className="w-full min-w-[720px] text-left text-xs">
        <caption className="sr-only">Recent illustrative hotspot detections</caption>
        <thead>
          <tr className="border-b border-border text-[10.5px] uppercase tracking-[0.12em] text-subtle">
            <th scope="col" className="py-2.5 pr-3 font-medium">ID</th>
            <th scope="col" className="py-2.5 pr-3 font-medium">Acquired (UTC)</th>
            <th scope="col" className="py-2.5 pr-3 font-medium">Region</th>
            <th scope="col" className="py-2.5 pr-3 font-medium">Sensor</th>
            <th scope="col" className="py-2.5 pr-3 text-right font-medium">FRP (MW)</th>
            <th scope="col" className="py-2.5 pr-3 font-medium">Confidence</th>
            <th scope="col" className="py-2.5 font-medium">Illustrative risk</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => (
            <tr key={d.id} className="border-b border-border/60 transition-colors last:border-0 hover:bg-surface-2/50">
              <td className="py-2.5 pr-3 font-mono text-muted">{d.id}</td>
              <td className="py-2.5 pr-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  {d.daynight === "D" ? <Sun className="size-3 text-fire-soft" aria-label="Day" /> : <Moon className="size-3 text-primary" aria-label="Night" />}
                  {formatDate(d.acq_date)} <span className="font-mono text-subtle">{d.acq_time.slice(0, 2)}:{d.acq_time.slice(2)}</span>
                </span>
              </td>
              <td className="py-2.5 pr-3">
                <span className="block">{REGION_BY_ID[d.regionId]?.name}</span>
                <span className="font-mono text-[10.5px] text-subtle">
                  {d.latitude.toFixed(2)}, {d.longitude.toFixed(2)}
                </span>
              </td>
              <td className="py-2.5 pr-3 whitespace-nowrap">
                <span className="inline-flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full" style={{ background: SOURCE_COLORS[d.source] }} aria-hidden />
                  {d.source} <span className="text-subtle">· {d.satellite}</span>
                </span>
              </td>
              <td className="py-2.5 pr-3 text-right font-mono tabular-nums">{d.frp.toFixed(1)}</td>
              <td className="py-2.5 pr-3 capitalize text-muted">{d.confidence}</td>
              <td className="py-2.5">
                <RiskBadge risk={d.risk} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
