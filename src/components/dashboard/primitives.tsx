"use client";

import { AlertTriangle, FlaskConical, Info, RefreshCw, SearchX, TrendingDown, TrendingUp } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { RISK_COLORS } from "@/lib/colors";
import type { RiskLevel } from "@/lib/types";
import { cn, fmtSignedPct } from "@/lib/utils";

export function DemoBadge({ label = "Demo Data", className }: { label?: string; className?: string }) {
  return (
    <Badge variant="demo" className={className} title="Illustrative, synthetic data — not real satellite observations">
      <FlaskConical className="size-3" aria-hidden />
      {label}
    </Badge>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div className="max-w-2xl">
        <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-accent/80">{eyebrow}</p>
        <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight md:text-[28px]">{title}</h1>
        <p className="mt-1.5 text-sm leading-relaxed text-muted">{description}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function RiskBadge({ risk, className }: { risk: RiskLevel; className?: string }) {
  const c = RISK_COLORS[risk];
  return (
    <span
      className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", className)}
      style={{ borderColor: `${c}55`, background: `${c}1a`, color: "var(--color-foreground)" }}
    >
      <span className="size-1.5 rounded-full" style={{ background: c }} aria-hidden />
      {risk}
    </span>
  );
}

export function KpiCard({
  label,
  value,
  unit,
  icon: Icon,
  delta,
  hint,
  accent = "#4c9eff",
  loading,
  invertDelta,
}: {
  label: string;
  value: string;
  unit?: string;
  icon: LucideIcon;
  delta?: number | null;
  hint: string;
  accent?: string;
  loading?: boolean;
  /** When true, a rise is shown as "worse" (all fire metrics: more = worse). */
  invertDelta?: boolean;
}) {
  const up = (delta ?? 0) > 0;
  const bad = invertDelta ? up : !up;
  return (
    <Card className="overflow-hidden">
      <div className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full opacity-20 blur-2xl" style={{ background: accent }} />
      <CardContent className="p-5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted">{label}</span>
          <span className="flex size-8 items-center justify-center rounded-lg border border-border bg-surface/80" style={{ color: accent }}>
            <Icon className="size-4" aria-hidden />
          </span>
        </div>
        {loading ? (
          <Skeleton className="mt-3 h-8 w-28" />
        ) : (
          <p className="mt-2 font-display text-[28px] font-semibold tracking-tight tabular-nums">
            {value}
            {unit && <span className="ml-1 text-sm font-normal text-muted">{unit}</span>}
          </p>
        )}
        <div className="mt-1.5 flex min-h-5 flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-muted">
          {!loading && delta != null && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded px-1 py-px font-medium tabular-nums",
                bad ? "bg-danger/12 text-bad-fg" : "bg-success/12 text-good-fg",
              )}
            >
              {up ? <TrendingUp className="size-3" aria-hidden /> : <TrendingDown className="size-3" aria-hidden />}
              {fmtSignedPct(delta)}
            </span>
          )}
          <span className="leading-snug">{hint}</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function ChartCard({
  title,
  description,
  actions,
  children,
  className,
  demo = false,
  footer,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  demo?: boolean;
  footer?: React.ReactNode;
}) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <CardHeader>
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <CardTitle>{title}</CardTitle>
            {demo && <DemoBadge className="scale-90" />}
          </div>
          {description && <CardDescription>{description}</CardDescription>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
      {footer && <div className="border-t border-border px-5 py-3 text-[11px] text-subtle">{footer}</div>}
    </Card>
  );
}

export function ChartSkeleton({ height = 280 }: { height?: number }) {
  return (
    <div className="flex flex-col justify-end gap-2" style={{ height }} role="status" aria-label="Loading chart">
      <div className="flex h-full items-end gap-1.5">
        {Array.from({ length: 24 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 rounded-sm" style={{ height: `${25 + ((i * 37) % 60)}%` }} />
        ))}
      </div>
      <Skeleton className="h-3 w-full" />
    </div>
  );
}

export function EmptyState({
  title = "No detections match these filters",
  message = "Try widening the date range, choosing another region, or including both satellite sources.",
  height = 280,
  action,
}: {
  title?: string;
  message?: string;
  height?: number;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border-strong px-6 text-center" style={{ minHeight: height }}>
      <SearchX className="size-7 text-subtle" aria-hidden />
      <p className="mt-3 text-sm font-medium">{title}</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{message}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry, height = 280 }: { error: Error; onRetry?: () => void; height?: number }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center justify-center rounded-xl border border-danger/30 bg-danger/5 px-6 text-center"
      style={{ minHeight: height }}
    >
      <AlertTriangle className="size-7 text-bad-fg" aria-hidden />
      <p className="mt-3 text-sm font-medium">Couldn’t load data</p>
      <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted">{error.message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          <RefreshCw /> Retry
        </Button>
      )}
    </div>
  );
}

export function Notice({ children, tone = "demo" }: { children: React.ReactNode; tone?: "demo" | "info" }) {
  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-xl border px-4 py-3 text-xs leading-relaxed",
        tone === "demo" ? "border-fire-soft/25 bg-fire-soft/[0.06] text-warn-fg" : "border-primary/25 bg-primary/[0.06] text-info-fg",
      )}
    >
      {tone === "demo" ? <FlaskConical className="mt-0.5 size-4 shrink-0" aria-hidden /> : <Info className="mt-0.5 size-4 shrink-0" aria-hidden />}
      <div>{children}</div>
    </div>
  );
}

/** Recharts tooltip with app styling. */
export function ChartTooltip({
  active,
  payload,
  label,
  labelFormatter,
  valueFormatter = (v: number) => v.toLocaleString("en-US"),
  showTotal,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string; dataKey?: string; payload?: Record<string, unknown> }[];
  label?: string | number;
  labelFormatter?: (l: string) => string;
  valueFormatter?: (v: number, name?: string) => string;
  showTotal?: boolean;
}) {
  if (!active || !payload?.length) return null;
  const total = payload.reduce((s, p) => s + (Number(p.value) || 0), 0);
  return (
    <div className="min-w-40 rounded-lg border border-border-strong bg-tooltip/95 px-3 py-2 text-xs shadow-xl shadow-black/20 backdrop-blur">
      {label != null && <p className="mb-1.5 font-medium text-foreground">{labelFormatter ? labelFormatter(String(label)) : label}</p>}
      <ul className="space-y-1">
        {payload.map((p) => (
          <li key={String(p.dataKey ?? p.name)} className="flex items-center justify-between gap-4">
            <span className="flex items-center gap-1.5 text-muted">
              <span className="size-2 rounded-sm" style={{ background: p.color }} aria-hidden />
              {p.name}
            </span>
            <span className="font-mono tabular-nums text-foreground">{valueFormatter(Number(p.value), p.name)}</span>
          </li>
        ))}
      </ul>
      {showTotal && payload.length > 1 && (
        <p className="mt-1.5 flex justify-between border-t border-border pt-1.5 text-muted">
          Total <span className="font-mono tabular-nums text-foreground">{valueFormatter(total)}</span>
        </p>
      )}
    </div>
  );
}

export function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5" data-legend-item={i.color}>
          <span className="size-2.5 rounded-sm" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
