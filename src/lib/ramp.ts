"use client";

import { useSyncExternalStore } from "react";

/**
 * Colour ramps for counts (calendar cells, map cells). "fire" is the house style; "viridis" and
 * "cividis" are perceptually uniform and readable with the common forms of colour blindness.
 * The choice is shared by every page and remembered in this browser.
 */
export const RAMPS = {
  fire: ["#0e1d33", "#2b1f45", "#5c2346", "#932c3c", "#c84a2c", "#ee7a2a", "#f7b24a", "#ffe8a3"],
  viridis: ["#440154", "#46327e", "#365c8d", "#277f8e", "#1fa187", "#4ac16d", "#a0da39", "#fde725"],
  cividis: ["#00224e", "#123570", "#3b496c", "#575d6d", "#707173", "#8a8779", "#a69d75", "#fee838"],
} as const;

export type RampName = keyof typeof RAMPS;
export const RAMP_OPTIONS: { value: RampName; label: string }[] = [
  { value: "fire", label: "Fire" },
  { value: "viridis", label: "Viridis" },
  { value: "cividis", label: "Cividis" },
];

const KEY = "firebridge.ramp";
const listeners = new Set<() => void>();
let current: RampName = "fire";
let loaded = false;

function load() {
  if (loaded) return;
  loaded = true;
  try {
    const v = window.localStorage.getItem(KEY);
    if (v && v in RAMPS) current = v as RampName;
  } catch {
    /* storage blocked: keep the default */
  }
}

export function setRampName(name: RampName) {
  current = name;
  try {
    window.localStorage.setItem(KEY, name);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function useRampName(): RampName {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => (load(), current),
    () => "fire",
  );
}

function hexToRgb(h: string) {
  const n = parseInt(h.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** t in [0, 1] → colour on the chosen ramp. */
export function rampColor(t: number, name: RampName = "fire") {
  const ramp = RAMPS[name];
  const x = Math.min(1, Math.max(0, t)) * (ramp.length - 1);
  const i = Math.min(ramp.length - 2, Math.floor(x));
  const f = x - i;
  const a = hexToRgb(ramp[i]);
  const b = hexToRgb(ramp[i + 1]);
  const c = a.map((v, k) => Math.round(v + (b[k] - v) * f));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

export const rampGradient = (name: RampName, from = 0) => `linear-gradient(90deg, ${RAMPS[name].slice(from).join(", ")})`;

/** Month abbreviation without pulling in a charting module. */
export const MONTHS_SHORT = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
