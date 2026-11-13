"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { FilterProvider } from "@/context/filters";
import { MobileSidebar, Sidebar } from "./sidebar";
import { Topbar } from "./topbar";
import { useIsRealDataPage } from "./data-source";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  const real = useIsRealDataPage();

  return (
    <FilterProvider>
      <div className="flex min-h-dvh bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(76,158,255,0.08),transparent),radial-gradient(800px_400px_at_10%_110%,rgba(255,122,47,0.05),transparent)]">
        <Sidebar />
        <MobileSidebar open={open} onClose={() => setOpen(false)} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar onMenu={() => setOpen(true)} />
          <main className="mx-auto w-full max-w-[1500px] flex-1 px-4 py-6 md:px-6 lg:px-8 lg:py-8">{children}</main>
          <footer className="border-t border-border px-4 py-4 text-[11px] text-subtle md:px-6 lg:px-8">
            {real
              ? "Harmonized record built from NASA FIRMS active-fire data (MODIS C6.1, VIIRS S-NPP 375 m). Research prototype, not for operational or emergency use."
              : "All figures shown are illustrative demo data unless a live backend is connected. Not for operational or emergency use."}
          </footer>
        </div>
      </div>
    </FilterProvider>
  );
}
