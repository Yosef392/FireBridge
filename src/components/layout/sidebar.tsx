"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, Satellite, X } from "lucide-react";
import { Logo } from "./logo";
import { DASHBOARD_NAV } from "./nav";
import { IS_DEMO } from "@/lib/api/config";
import { cn } from "@/lib/utils";
import { useIsRealDataPage } from "./data-source";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Dashboard" className="flex flex-col gap-1">
      <p className="px-3 pb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-subtle">Mission control</p>
      {DASHBOARD_NAV.map((item) => {
        const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
              active ? "bg-primary/10 text-foreground" : "text-muted hover:bg-surface-2 hover:text-foreground",
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" aria-hidden />}
            <Icon className={cn("size-[18px]", active ? "text-primary" : "text-subtle group-hover:text-muted")} aria-hidden />
            <span className="flex flex-col leading-tight">
              <span className="font-medium">{item.label}</span>
              <span className="text-[11px] text-subtle">{item.description}</span>
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

function SidebarFooter() {
  const real = useIsRealDataPage();
  const demo = IS_DEMO && !real;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-border bg-surface/70 p-3">
        <div className="flex items-center gap-2 text-xs font-medium">
          <Satellite className="size-3.5 text-accent" aria-hidden />
          Data pipeline
        </div>
        <p className="mt-1.5 text-[11px] leading-relaxed text-muted">
          {real
            ? "This page shows our harmonized NASA FIRMS results, exported from the Colab notebooks."
            : IS_DEMO
            ? "Running on an illustrative demo archive shaped like NASA FIRMS MODIS / VIIRS records."
            : "Connected to the FireBridge analysis API."}
        </p>
        <div className="mt-2 flex items-center gap-1.5 text-[11px]">
          <span className={cn("size-1.5 rounded-full", demo ? "bg-fire-soft" : "bg-success")} aria-hidden />
          <span className="text-muted">{real ? "Real data" : IS_DEMO ? "Demo mode" : "API mode"}</span>
        </div>
      </div>
      <Link href="/" className="flex items-center gap-2 px-3 text-xs text-muted transition-colors hover:text-foreground">
        <ArrowLeft className="size-3.5" aria-hidden /> Back to project site
      </Link>
    </div>
  );
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[264px] shrink-0 flex-col justify-between border-r border-border bg-[#081426]/80 p-5 lg:flex">
      <div className="space-y-8">
        <Logo />
        <NavLinks />
      </div>
      <SidebarFooter />
    </aside>
  );
}

export function MobileSidebar({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <div className={cn("fixed inset-0 z-[1100] lg:hidden", open ? "pointer-events-auto" : "pointer-events-none")} aria-hidden={!open}>
      <div className={cn("absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity", open ? "opacity-100" : "opacity-0")} onClick={onClose} />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Navigation"
        className={cn(
          "absolute inset-y-0 left-0 flex w-[280px] flex-col justify-between border-r border-border bg-[#081426] p-5 transition-transform duration-300",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <Logo />
            <button onClick={onClose} className="rounded-lg p-1.5 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Close navigation">
              <X className="size-5" />
            </button>
          </div>
          <NavLinks onNavigate={onClose} />
        </div>
        <SidebarFooter />
      </aside>
    </div>
  );
}
