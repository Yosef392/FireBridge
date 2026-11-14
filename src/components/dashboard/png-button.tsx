"use client";

import { useState } from "react";
import { ImageDown } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Saves a chart as PNG. `run` does the drawing and download; null keeps the button disabled. */
export function PngButton({ title, run }: { title: string; run: (() => void | Promise<void>) | null }) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={!run || busy}
      title={`Save ${title} as PNG`}
      aria-label={`Download ${title} as PNG`}
      onClick={async () => {
        if (!run) return;
        setBusy(true);
        try {
          await run();
        } catch (e) {
          console.error(e);
        } finally {
          setBusy(false);
        }
      }}
    >
      <ImageDown aria-hidden /> PNG
    </Button>
  );
}
