"use client";

import { usePathname } from "next/navigation";

/** Dashboard pages that read the exported NASA FIRMS results in /public/data instead of the demo archive. */
export const REAL_DATA_ROUTES = ["/dashboard/calendar"];

export function useIsRealDataPage(): boolean {
  const pathname = usePathname() ?? "";
  return REAL_DATA_ROUTES.some((r) => pathname.startsWith(r));
}
