import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BarChart3,
  BellRing,
  BrainCircuit,
  Clock,
  Database,
  Eye,
  Flame,
  Github,
  Globe2,
  Layers,
  Map,
  Orbit,
  Radar,
  Satellite,
  ShieldCheck,
  Thermometer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/layout/logo";
import { EarthGlobe } from "@/components/landing/earth-globe";
import { Pipeline } from "@/components/landing/pipeline";

const NAV = [
  { href: "#overview", label: "Overview" },
  { href: "#how-it-works", label: "How it works" },
  { href: "#features", label: "Features" },
  { href: "#data", label: "Data" },
  { href: "#team", label: "Team" },
];

function SectionHeading({ eyebrow, title, text }: { eyebrow: string; title: React.ReactNode; text?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <p className="font-mono text-[11px] uppercase tracking-[0.24em] text-accent/80">{eyebrow}</p>
      <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight md:text-4xl">{title}</h2>
      {text && <p className="mt-4 text-[15px] leading-relaxed text-muted">{text}</p>}
    </div>
  );
}

const FEATURES = [
  { icon: Map, title: "Fire map", text: "Fire detections per 10 km cell for any region, year and month, on the harmonized, MODIS or VIIRS record." },
  { icon: BarChart3, title: "Regional analytics", text: "Fire seasons, good and bad years, and how much more VIIRS sees than MODIS in each region." },
  { icon: BrainCircuit, title: "Harmonization model", text: "A per-region ratio times an XGBoost correction rebuilds 2000–2012 on the VIIRS scale, with an uncertainty band." },
  { icon: Layers, title: "Burning-activity calendar", text: "25 years of monthly fire activity per region in one consistent heatmap, with known events outlined." },
  { icon: BellRing, title: "Anomaly detection", text: "Flags months far above the same month in other years: NSW 2019, Canada 2023 and Portugal 2017 come out on top." },
  { icon: ShieldCheck, title: "Honest by design", text: "Every score is on years the model never saw, model estimates are labelled, and limitations are documented." },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-x-hidden">
      {/* Header */}
      <header className="fixed inset-x-0 top-0 z-50 border-b border-border/60 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 md:px-6">
          <Logo />
          <nav aria-label="Primary" className="hidden items-center gap-1 md:flex">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className="rounded-lg px-3 py-2 text-sm text-muted transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <Button asChild size="sm">
            <Link href="/dashboard">
              Dashboard <ArrowRight />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="relative isolate pt-28 md:pt-32">
        <div className="bg-grid absolute inset-0 -z-10 [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
        <div className="absolute left-1/2 top-0 -z-10 h-[620px] w-[1100px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,rgba(76,158,255,0.16),transparent)]" />
        <div className="absolute right-[8%] top-[38%] -z-10 h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,rgba(255,122,47,0.16),transparent)]" />

        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-4 pb-16 md:px-6 lg:grid-cols-[1.05fr_1fr] lg:pb-24">
          <div className="animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full border border-border-strong bg-surface/70 px-3 py-1 text-xs text-muted">
                <Orbit className="size-3.5 text-accent" aria-hidden /> NASA Space Apps Challenge project
              </span>
            </div>
            <h1 className="mt-6 font-display text-[42px] font-semibold leading-[1.04] tracking-tight sm:text-6xl lg:text-[68px]">
              See the Fire
              <br />
              <span className="text-gradient-fire">Before It Spreads.</span>
            </h1>
            <p className="mt-6 max-w-xl text-base leading-relaxed text-muted md:text-lg">
              MODIS and VIIRS count fires differently, so joining their records creates a fake jump in 2012.
              FireBridge harmonizes 25 years of NASA fire observations into one consistent record, so real trends
              and unusual fire seasons can be seen, region by region.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" variant="fire">
                <Link href="/dashboard">
                  Explore Dashboard <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <a href="#how-it-works">How It Works</a>
              </Button>
            </div>
            <dl className="mt-10 grid max-w-lg grid-cols-3 gap-4 border-t border-border pt-6">
              {[
                ["2", "satellite sensors"],
                ["375 m", "finest fire pixel"],
                ["25 yrs", "one consistent record"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-2xl font-semibold">{v}</dd>
                  <dd className="mt-0.5 text-xs text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="relative mx-auto w-full max-w-[560px]">
            <EarthGlobe />
            {/* Floating telemetry cards */}
            <div className="glass absolute left-0 top-[12%] hidden rounded-xl border border-border-strong px-3.5 py-2.5 shadow-2xl sm:block">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                <Satellite className="size-3 text-accent" aria-hidden /> VIIRS · pass 0417
              </p>
              <p className="mt-1 text-sm font-medium">
                Thermal anomaly cluster <span className="text-fire-soft">● 14</span>
              </p>
            </div>
            <div className="glass absolute bottom-[14%] right-0 hidden rounded-xl border border-border-strong px-3.5 py-2.5 shadow-2xl sm:block">
              <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-subtle">
                <Radar className="size-3 text-fire" aria-hidden /> Harmonized · NSW
              </p>
              <p className="mt-1 flex items-center gap-2 text-sm font-medium">
                Nov 2019 anomaly <span className="rounded-full bg-[#d23a78]/20 px-2 py-0.5 text-[11px] text-[#f3a6c6]">z 27</span>
              </p>
            </div>
            <p className="mt-2 text-center text-[11px] text-subtle">Globe markers show our 7 study regions</p>
          </div>
        </div>
      </section>

      {/* Overview / problem / solution */}
      <section id="overview" className="scroll-mt-20 border-t border-border bg-[#081426]/60 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Project overview"
            title={<>From raw thermal anomalies to <span className="text-gradient-fire">actionable insight</span></>}
            text="Satellites detect thousands of active fires every day, but two sensors with different eyes make the long-term record inconsistent. We built a platform that joins them."
          />
          <div className="mt-14 grid grid-cols-1 gap-5 md:grid-cols-2">
            <div className="rounded-2xl border border-border bg-surface/60 p-7">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-ember/12 text-[#ff8f92]">
                <Flame className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">The problem</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
                <li className="flex gap-3"><Thermometer className="mt-0.5 size-4 shrink-0 text-fire-soft" aria-hidden />Fire seasons are becoming longer and more intense across many regions.</li>
                <li className="flex gap-3"><Database className="mt-0.5 size-4 shrink-0 text-fire-soft" aria-hidden />Open satellite fire data is rich but large, noisy and hard to interpret without expertise.</li>
                <li className="flex gap-3"><Clock className="mt-0.5 size-4 shrink-0 text-fire-soft" aria-hidden />The two sensors count fires differently, so the switch in 2012 looks like a jump in fire activity that never happened.</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-primary/25 bg-gradient-to-b from-primary/[0.07] to-surface/60 p-7">
              <span className="inline-flex size-10 items-center justify-center rounded-xl bg-primary/12 text-primary">
                <Eye className="size-5" aria-hidden />
              </span>
              <h3 className="mt-5 font-display text-xl font-semibold">Our solution</h3>
              <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted">
                <li className="flex gap-3"><Globe2 className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />Clean MODIS + VIIRS archive gridded into 10 km cells and harmonized into one record.</li>
                <li className="flex gap-3"><Activity className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />Analytics that reveal seasonality, trends and hotspot intensity at a glance.</li>
                <li className="flex gap-3"><BrainCircuit className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />A machine-learning model that rebuilds the MODIS years on the VIIRS scale, tested on years it never saw.</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Methodology */}
      <section id="how-it-works" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Methodology"
            title="How it works"
            text="A transparent, reproducible pipeline from orbit to dashboard. Each stage is designed to be inspected and improved."
          />
          <div className="mt-14">
            <Pipeline />
          </div>
          <div className="mt-8 text-center">
            <Button asChild variant="ghost">
              <Link href="/dashboard/about">
                Read the full methodology <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="scroll-mt-20 border-y border-border bg-[#081426]/60 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading eyebrow="Key features" title="Built for analysts, responders and researchers" />
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.title} className="group rounded-2xl border border-border bg-surface/60 p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40">
                  <span className="inline-flex size-10 items-center justify-center rounded-xl border border-border bg-surface-2 text-accent transition-colors group-hover:text-fire-soft">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <h3 className="mt-5 font-display text-base font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted">{f.text}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Data sources */}
      <section id="data" className="scroll-mt-20 py-20 md:py-28">
        <div className="mx-auto max-w-7xl px-4 md:px-6">
          <SectionHeading
            eyebrow="Data sources"
            title="Powered by NASA Earth observation"
            text="The platform is designed around NASA’s FIRMS active-fire products from two complementary instruments."
          />
          <div className="mt-14 grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[
              {
                name: "MODIS",
                sub: "Terra & Aqua · since 2000",
                stats: [["~1 km", "fire pixel"], ["4×", "daily passes"], ["20+ yrs", "archive"]],
                text: "The long, consistent MODIS record is the backbone for trend and seasonality analysis.",
                color: "#3987e5",
              },
              {
                name: "VIIRS",
                sub: "Suomi NPP · NOAA-20 · NOAA-21 · since 2012",
                stats: [["375 m", "fire pixel"], ["Night", "sensitivity"], ["Small", "fire detection"]],
                text: "VIIRS’ finer resolution reveals smaller and cooler fires, sharpening hotspot geography.",
                color: "#d95926",
              },
            ].map((s) => (
              <div key={s.name} className="relative overflow-hidden rounded-2xl border border-border bg-surface/60 p-7">
                <div className="absolute -right-16 -top-16 size-48 rounded-full opacity-20 blur-3xl" style={{ background: s.color }} />
                <div className="flex items-center gap-3">
                  <Satellite className="size-6" style={{ color: s.color }} aria-hidden />
                  <div>
                    <h3 className="font-display text-2xl font-semibold">{s.name}</h3>
                    <p className="text-xs text-muted">{s.sub}</p>
                  </div>
                </div>
                <p className="mt-5 text-sm leading-relaxed text-muted">{s.text}</p>
                <dl className="mt-6 grid grid-cols-3 gap-3">
                  {s.stats.map(([v, l]) => (
                    <div key={l} className="rounded-xl border border-border bg-background/40 p-3">
                      <dd className="font-display text-lg font-semibold">{v}</dd>
                      <dt className="text-[11px] text-muted">{l}</dt>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>
          <div className="mx-auto mt-8 flex max-w-3xl flex-col items-center gap-3 rounded-2xl border border-fire-soft/25 bg-fire-soft/[0.05] p-5 text-center sm:flex-row sm:text-left">
            <p className="text-xs leading-relaxed text-[#f3d3a6]">
              The dashboard shows real NASA FIRMS results for 7 study regions, processed in our Colab notebooks and served as
              static files. It is a research prototype, not an operational fire-warning system.
            </p>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 pb-20 md:px-6 md:pb-28">
        <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl border border-border-strong bg-gradient-to-br from-surface-2 via-surface to-[#1a1220] p-10 text-center md:p-14">
          <div className="bg-grid absolute inset-0 opacity-50 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
          <div className="relative">
            <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
              Explore the <span className="text-gradient-fire">mission dashboard</span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted">
              The harmonized record for 7 regions: calendar, fire map, regional analytics and the model's test scores.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild size="lg" variant="fire">
                <Link href="/dashboard">
                  Open Dashboard <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/dashboard/map">View Fire Map</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer / team */}
      <footer id="team" className="scroll-mt-20 border-t border-border bg-[#050d18]">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-14 md:grid-cols-[1.3fr_2fr] md:px-6">
          <div>
            <Logo />
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
              AI-powered wildfire monitoring, analytics and early warning — a NASA Space Apps Challenge prototype.
            </p>
            <p className="mt-4 text-xs text-subtle">
              Data courtesy of NASA FIRMS (MODIS & VIIRS). This project is not affiliated with or endorsed by NASA.
            </p>
          </div>
          <div>
            <p className="flex items-center gap-2 font-mono text-[11px] uppercase tracking-[0.2em] text-subtle">
              <Users className="size-3.5" aria-hidden /> Team
            </p>
            <ul className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {["Data Engineering", "Machine Learning", "Frontend & Design", "Research & Domain"].map((role, i) => (
                <li key={role} className="rounded-xl border border-dashed border-border-strong p-4">
                  <span className="flex size-9 items-center justify-center rounded-full bg-surface-2 font-mono text-xs text-muted">T{i + 1}</span>
                  <p className="mt-3 text-sm font-medium">Team Member {i + 1}</p>
                  <p className="text-xs text-muted">{role}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="border-t border-border">
          <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-4 py-5 text-xs text-subtle sm:flex-row md:px-6">
            <p>© {new Date().getFullYear()} FireBridge · Team name placeholder</p>
            <p className="flex items-center gap-4">
              <span className="inline-flex items-center gap-1.5">
                <Github className="size-3.5" aria-hidden /> Repository link placeholder
              </span>
              <span>Not for operational or emergency use</span>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
