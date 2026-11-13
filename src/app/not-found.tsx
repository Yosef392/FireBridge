import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LogoMark } from "@/components/layout/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <LogoMark className="size-12" />
      <p className="font-mono text-xs uppercase tracking-[0.2em] text-subtle">404 · Signal lost</p>
      <h1 className="font-display text-3xl font-semibold">This orbit has no data</h1>
      <p className="max-w-md text-sm text-muted">The page you’re looking for doesn’t exist.</p>
      <div className="flex gap-3">
        <Button asChild variant="outline"><Link href="/">Home</Link></Button>
        <Button asChild><Link href="/dashboard">Dashboard</Link></Button>
      </div>
    </main>
  );
}
