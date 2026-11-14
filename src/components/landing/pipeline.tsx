import { BrainCircuit, ChevronRight, Filter, LayoutDashboard, Satellite, ScanSearch, ShieldAlert } from "lucide-react";

export const PIPELINE = [
  { icon: Satellite, title: "Satellite Data", text: "MODIS & VIIRS active-fire records (FIRMS archive): location, time, FRP, brightness, confidence." },
  { icon: Filter, title: "Data Cleaning", text: "Keep vegetation fires only, check for gaps, and grid every detection to 10 km equal-area cells per month." },
  { icon: ScanSearch, title: "Exploratory Analysis", text: "Seasonality, the 2012 jump, and how many VIIRS fires each MODIS fire stands for, region by region." },
  { icon: BrainCircuit, title: "Machine Learning", text: "Per-region ratio × XGBoost correction (Poisson), trained 2013–2020, tuned on 2021 and tested on every year since." },
  { icon: ShieldAlert, title: "Validation", text: "2012 jump check, held-out regions, and known fire events found as the top anomalies." },
  { icon: LayoutDashboard, title: "Dashboard", text: "Calendar, map and analytics in a Next.js app, read from static JSON and hosted on Vercel." },
];

export function Pipeline({ compact = false }: { compact?: boolean }) {
  return (
    <ol className={compact ? "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"}>
      {PIPELINE.map((s, i) => {
        const Icon = s.icon;
        return (
          <li key={s.title} className="group relative rounded-2xl border border-border bg-surface/60 p-4 transition-colors hover:border-primary/40">
            <div className="flex items-center justify-between">
              <span className="flex size-9 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent transition-colors group-hover:text-fire-soft">
                <Icon className="size-[18px]" aria-hidden />
              </span>
              <span className="font-mono text-[11px] text-subtle">0{i + 1}</span>
            </div>
            <p className="mt-3 font-display text-sm font-semibold">{s.title}</p>
            <p className="mt-1 text-xs leading-relaxed text-muted">{s.text}</p>
            {!compact && i < PIPELINE.length - 1 && (
              <ChevronRight className="absolute -right-3.5 top-1/2 hidden size-5 -translate-y-1/2 text-subtle xl:block" aria-hidden />
            )}
          </li>
        );
      })}
    </ol>
  );
}
