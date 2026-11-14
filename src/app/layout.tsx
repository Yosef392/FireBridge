import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { THEME_BOOT_SCRIPT } from "@/lib/theme-boot";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const display = Space_Grotesk({ subsets: ["latin"], variable: "--font-display-face", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

export const metadata: Metadata = {
  title: { default: "FireBridge — Satellite wildfire analytics & early warning", template: "%s · FireBridge" },
  description:
    "AI-assisted wildfire monitoring, analytics and early-warning prototype built on the structure of NASA MODIS and VIIRS active-fire data. NASA Space Apps Challenge project.",
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#07111F" },
  ],
  colorScheme: "dark light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      data-theme="dark"
      className={`${inter.variable} ${display.variable} ${mono.variable}`}
      // The boot script below changes data-theme before React hydrates.
      suppressHydrationWarning
    >
      <head>
        {/* Sets the saved (or system) theme before the first paint, so the page never flashes the wrong one. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">{children}</body>
    </html>
  );
}
