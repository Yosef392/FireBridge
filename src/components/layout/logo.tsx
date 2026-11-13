import Link from "next/link";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={cn("size-8", className)} aria-hidden>
      <defs>
        <linearGradient id="wf-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#ff3d4e" />
          <stop offset="0.6" stopColor="#ff7a2f" />
          <stop offset="1" stopColor="#ffc861" />
        </linearGradient>
      </defs>
      <circle cx="16" cy="16" r="14.5" fill="#0b1a2e" stroke="rgba(92,225,230,0.45)" />
      <ellipse cx="16" cy="16" rx="14.5" ry="5.2" fill="none" stroke="rgba(76,158,255,0.45)" transform="rotate(-24 16 16)" />
      <path d="M16 7.5c1.6 3 4.8 4.9 4.8 9.2a4.8 4.8 0 0 1-9.6 0c0-2.2 1.1-3.4 2.2-4.6.2 1.4.9 2.4 1.9 2.8-.4-2.8.1-5.1.7-7.4Z" fill="url(#wf-flame)" />
      <circle cx="26.2" cy="9.6" r="1.6" fill="#5ce1e6" />
    </svg>
  );
}

export function Logo({ href = "/", compact = false }: { href?: string; compact?: boolean }) {
  return (
    <Link href={href} className="group flex items-center gap-2.5" aria-label="Wildfire Intelligence home">
      <LogoMark className="transition-transform group-hover:rotate-[-8deg]" />
      {!compact && (
        <span className="leading-none">
          <span className="block font-display text-[15px] font-semibold tracking-tight">Wildfire Intelligence</span>
          <span className="mt-1 block font-mono text-[9.5px] uppercase tracking-[0.22em] text-muted">Earth Observation · AI</span>
        </span>
      )}
    </Link>
  );
}
