"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadCsv } from "@/lib/csv";

/**
 * Downloads a CSV built on click. `build` returns null while the data isn't loaded yet,
 * so the button stays disabled until there is something to export.
 */
export function CsvButton({
  label = "CSV",
  title,
  build,
}: {
  label?: string;
  /** Tooltip / accessible description of what the file contains. */
  title: string;
  build: (() => { filename: string; csv: string }) | null;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!build}
      title={title}
      aria-label={`Download ${title} as CSV`}
      onClick={() => {
        if (!build) return;
        const { filename, csv } = build();
        downloadCsv(filename, csv);
      }}
    >
      <Download aria-hidden /> {label}
    </Button>
  );
}
