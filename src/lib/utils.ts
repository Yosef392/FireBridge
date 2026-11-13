import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const nf = new Intl.NumberFormat("en-US");
const cf = new Intl.NumberFormat("en-US", { notation: "compact", maximumFractionDigits: 1 });

export const fmtInt = (n: number) => nf.format(Math.round(n));
export const fmtCompact = (n: number) => cf.format(n);
export const fmtPct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`;
export const fmtSignedPct = (n: number, digits = 0) => `${n > 0 ? "+" : n < 0 ? "−" : "±"}${Math.abs(n * 100).toFixed(digits)}%`;
export const fmtMW = (n: number) => `${n >= 100 ? Math.round(n) : n.toFixed(1)} MW`;
