'use client';

import { useEffect } from 'react';
import Link from 'next/link';

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
    process.env.NODE_ENV === 'development' ? error?.message : 'Something went wrong on our end.';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[oklch(0.10_0_0)] px-6 font-sans text-[oklch(0.93_0_0)] antialiased">
      <div className="w-full max-w-md space-y-10">
        {/* Status line */}
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs tracking-widest text-[oklch(0.55_0_0)] uppercase select-none">
            Error
          </span>
          <span className="h-px flex-1 bg-[oklch(1_0_0/7%)]" />
          <span className="font-mono text-xs tracking-widest text-[oklch(0.55_0_0)] uppercase select-none">
            Something broke
          </span>
        </div>

        {/* Main content */}
        <div className="space-y-4">
          <h1 className="text-2xl font-semibold tracking-tight">An unexpected error occurred</h1>
          <p className="text-sm leading-relaxed text-[oklch(0.55_0_0)]">{message}</p>
          {digest && (
            <p className="font-mono text-xs text-[oklch(0.55_0_0)]">
              Error ID: <span className="text-[oklch(0.75_0_0)]">{digest}</span>
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <button
            onClick={reset}
            className="h-9 w-full rounded-lg bg-[oklch(0.62_0.16_263)] px-4 text-sm font-medium text-white transition-colors hover:bg-[oklch(0.56_0.16_263)]"
          >
            Try again
          </button>
          <Link
            href="/dashboard"
            className="flex h-9 w-full items-center justify-center rounded-lg border border-[oklch(1_0_0/7%)] bg-[oklch(0.13_0_0)] px-4 text-sm font-medium text-[oklch(0.93_0_0)] transition-colors hover:bg-[oklch(0.16_0_0)]"
          >
            Go to dashboard
          </Link>
        </div>

        {/* Hint */}
        <p className="text-xs leading-relaxed text-[oklch(0.40_0_0)]">
          If this keeps happening, try clearing your browser cache or logging out and back in. You
          can also{' '}
          <a
            href="https://github.com/elias4044/schoolsoftplus/issues"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[oklch(0.55_0_0)] underline underline-offset-2 transition-colors hover:text-[oklch(0.75_0_0)]"
          >
            report this on GitHub
          </a>
          .
        </p>
      </div>
    </div>
  );
}
