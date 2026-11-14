import { BarChart3, BrainCircuit, CalendarDays, Gauge, Info, Map } from "lucide-react";

export const DASHBOARD_NAV = [
  { href: "/dashboard", label: "Overview", icon: Gauge, description: "All study regions" },
  { href: "/dashboard/calendar", label: "Calendar", icon: CalendarDays, description: "Harmonized MODIS + VIIRS record" },
  { href: "/dashboard/map", label: "Fire Map", icon: Map, description: "Fires per 10 km cell" },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3, description: "How the regions differ" },
  { href: "/dashboard/model", label: "Model", icon: BrainCircuit, description: "How it works & test scores" },
  { href: "/dashboard/about", label: "About", icon: Info, description: "Methodology & data" },
] as const;
