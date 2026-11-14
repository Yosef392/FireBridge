/**
 * PNG export for charts, done in the browser:
 * - Recharts charts are SVG: serialise the SVG, draw it on a canvas, save.
 * - Anything else can be drawn straight onto a canvas by the caller (see `downloadCanvas`).
 * Every image gets a title, a source line and the dashboard background so it reads on its own.
 */

import { CHART_THEMES } from "./colors";
import { currentTheme } from "./theme";

const FONT = "Inter, system-ui, sans-serif";
/** Background, text and muted colours of the theme the page is shown in. */
const frameColors = () => {
  const c = CHART_THEMES[currentTheme()];
  return { BG: c.background, FG: c.foreground, MUTED: c.muted };
};
export const PNG_SCALE = 2; // retina-sharp output

export function downloadCanvas(canvas: HTMLCanvasElement, filename: string) {
  canvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename.endsWith(".png") ? filename : `${filename}.png`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, "image/png");
}

/** Canvas with background, title and footer; returns the context and the drawable area below the title. */
export function framedCanvas(width: number, height: number, title: string, subtitle?: string) {
  const { BG, FG, MUTED } = frameColors();
  const header = subtitle ? 58 : 40;
  const footer = 28;
  const canvas = document.createElement("canvas");
  canvas.width = (width + 32) * PNG_SCALE;
  canvas.height = (height + header + footer + 16) * PNG_SCALE;
  const ctx = canvas.getContext("2d")!;
  ctx.scale(PNG_SCALE, PNG_SCALE);
  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, width + 32, height + header + footer + 16);
  ctx.fillStyle = FG;
  ctx.font = `600 16px ${FONT}`;
  ctx.fillText(title, 16, 28);
  if (subtitle) {
    ctx.fillStyle = MUTED;
    ctx.font = `12px ${FONT}`;
    ctx.fillText(subtitle, 16, 48);
  }
  ctx.fillStyle = MUTED;
  ctx.font = `10px ${FONT}`;
  ctx.fillText(
    `FireBridge · harmonized NASA FIRMS MODIS + VIIRS · exported ${new Date().toISOString().slice(0, 10)}`,
    16,
    height + header + footer,
  );
  return { canvas, ctx, x: 16, y: header, width, height };
}

/** Rasterises the first <svg> inside `root` (a Recharts chart) plus any HTML legend text is skipped. */
export async function downloadSvgChart(root: HTMLElement, filename: string, title: string, subtitle?: string) {
  const svg = root.querySelector("svg.recharts-surface") ?? root.querySelector("svg");
  if (!svg) throw new Error("No chart found to export.");
  const { width, height } = svg.getBoundingClientRect();
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(width));
  clone.setAttribute("height", String(height));
  // Recharts text inherits the page font; pin it so the image looks the same everywhere.
  clone.setAttribute("font-family", FONT);
  const xml = new XMLSerializer().serializeToString(clone);
  const img = new Image();
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`;
  await img.decode();

  // Legend items rendered as HTML next to the chart: copy their labels and colours onto the image.
  const legend = [...root.querySelectorAll<HTMLElement>("[data-legend-item]")].map((el) => ({
    label: el.innerText.trim(),
    color: el.dataset.legendItem ?? frameColors().FG,
  }));
  // Lay the legend out in rows that fit the chart width (measured with a scratch canvas).
  const measure = document.createElement("canvas").getContext("2d")!;
  measure.font = `11px ${FONT}`;
  const placed: { label: string; color: string; x: number; row: number }[] = [];
  let lx = 0;
  let row = 0;
  for (const item of legend) {
    const w = 24 + measure.measureText(item.label).width;
    if (lx > 0 && lx + w > width) {
      lx = 0;
      row++;
    }
    placed.push({ ...item, x: lx, row });
    lx += w;
  }
  const legendH = legend.length ? (row + 1) * 18 + 6 : 0;
  const { FG } = frameColors();

  const f = framedCanvas(width, height + legendH, title, subtitle);
  f.ctx.font = `11px ${FONT}`;
  for (const p of placed) {
    const y = f.y + p.row * 18;
    f.ctx.fillStyle = p.color;
    f.ctx.fillRect(f.x + p.x, y + 4, 10, 10);
    f.ctx.fillStyle = FG;
    f.ctx.fillText(p.label, f.x + p.x + 14, y + 13);
  }
  f.ctx.drawImage(img, f.x, f.y + legendH, width, height);
  downloadCanvas(f.canvas, filename);
}
