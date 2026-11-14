"use client";

import { usePathname } from "next/navigation";

/** Pages that read the exported NASA FIRMS results in /public/data instead of the demo archive. */
export const REAL_DATA_ROUTES = ["/dashboard"];

export function useIsRealDataPage(): boolean {
  const pathname = usePathname() ?? "";
  return REAL_DATA_ROUTES.some((r) => pathname.startsWith(r));
}
