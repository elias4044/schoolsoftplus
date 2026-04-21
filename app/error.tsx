"use client";

import { useEffect } from "react";
import Link from "next/link";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: ErrorProps) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  const digest = error?.digest;
  const message =
    process.env.NODE_ENV === "development"
      ? error?.message
      : "Something went wrong on our end.";

  return (
    <html lang="en">
      <body className="min-h-screen bg-[oklch(0.10_0_0)] text-[oklch(0.93_0_0)] font-sans antialiased flex items-center justify-center px-6">
        <div className="w-full max-w-md space-y-10">

          {/* Status line */}
          <div className="flex items-center gap-3">
            <span className="font-mono text-xs text-[oklch(0.55_0_0)] tracking-widest uppercase select-none">
              Error
            </span>
            <span className="h-px flex-1 bg-[oklch(1_0_0/7%)]" />
            <span className="font-mono text-xs text-[oklch(0.55_0_0)] tracking-widest uppercase select-none">
              Something broke
            </span>
          </div>

          {/* Main content */}
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold tracking-tight">
              An unexpected error occurred
            </h1>
            <p className="text-[oklch(0.55_0_0)] text-sm leading-relaxed">
              {message}
            </p>
            {digest && (
              <p className="font-mono text-xs text-[oklch(0.55_0_0)]">
                Error ID:{" "}
                <span className="text-[oklch(0.75_0_0)]">{digest}</span>
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={reset}
              className="w-full h-9 px-4 rounded-lg bg-[oklch(0.62_0.16_263)] text-white text-sm font-medium hover:bg-[oklch(0.56_0.16_263)] transition-colors"
            >
              Try again
            </button>
            <Link
              href="/dashboard"
              className="w-full h-9 px-4 rounded-lg border border-[oklch(1_0_0/7%)] bg-[oklch(0.13_0_0)] text-[oklch(0.93_0_0)] text-sm font-medium hover:bg-[oklch(0.16_0_0)] transition-colors flex items-center justify-center"
            >
              Go to dashboard
            </Link>
          </div>

          {/* Hint */}
          <p className="text-xs text-[oklch(0.40_0_0)] leading-relaxed">
            If this keeps happening, try clearing your browser cache or logging
            out and back in. You can also{" "}
            <a
              href="https://github.com/elias4044/schoolsoftplus/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[oklch(0.55_0_0)] hover:text-[oklch(0.75_0_0)] underline underline-offset-2 transition-colors"
            >
              report this on GitHub
            </a>
            .
          </p>

        </div>
      </body>
    </html>
  );
}
