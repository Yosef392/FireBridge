"use client";

import { ErrorState } from "@/components/dashboard/primitives";

export default function DashboardError({ error, reset }: { error: Error; reset: () => void }) {
  return <ErrorState error={error} onRetry={reset} height={420} />;
}
