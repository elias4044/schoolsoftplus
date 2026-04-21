import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "404 — Page not found",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background text-foreground flex items-center justify-center px-6">
      <div className="w-full max-w-md space-y-10">

        {/* Status line */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase select-none">
            404
          </span>
          <span className="h-px flex-1 bg-border" />
          <span className="font-mono text-xs text-muted-foreground tracking-widest uppercase select-none">
            Not found
          </span>
        </div>

        {/* Main content */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">
            This page doesn&apos;t exist
          </h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            The URL you followed may be mistyped, outdated, or the page may
            have been moved. Double-check the address bar.
          </p>
        </div>

        {/* Suggestions */}
        <div className="surface rounded-lg divide-y divide-border">
          {[
            { href: "/dashboard", label: "Dashboard", desc: "Your main overview" },
            { href: "/schedule", label: "Schedule", desc: "Upcoming lessons" },
            { href: "/news", label: "News", desc: "School announcements" },
          ].map(({ href, label, desc }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors first:rounded-t-lg last:rounded-b-lg group"
            >
              <span className="flex flex-col gap-0.5">
                <span className="text-sm font-medium group-hover:text-foreground text-foreground/80 transition-colors">
                  {label}
                </span>
                <span className="text-xs text-muted-foreground">{desc}</span>
              </span>
              <svg
                className="size-4 text-muted-foreground group-hover:text-foreground transition-colors shrink-0"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </Link>
          ))}
        </div>

        {/* Back link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className="size-4"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />
            </svg>
            Back to home
          </Link>
        </div>

      </div>
    </div>
  );
}
