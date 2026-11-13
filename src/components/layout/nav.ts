import { BarChart3, BrainCircuit, CalendarDays, Gauge, Info, Map } from "lucide-react";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: Gauge, description: "KPIs & activity summary" },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, description: "Harmonized MODIS + VIIRS record" },
  { href: "/dashboard/map", label: "Fire Map", icon: Map, description: "Geographic hotspot explorer" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, description: "Trends & distributions" },
  { href: "/dashboard/predictions", label: "Predictions", icon: BrainCircuit, description: "Model risk outlook" },
  { href: "/dashboard/about", label: "About", icon: Info, description: "Methodology & data" },
] as const;
