"use client";

import Link from "next/link";
import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("App route error boundary triggered", error, {
      digest: error.digest,
      source: "src/app/error.tsx",
    });
  }, [error]);

  return (
    <main className="min-h-screen bg-[var(--color-bg)] px-5 py-12 text-[var(--color-text)] md:px-10">
      <div className="mx-auto w-full max-w-2xl rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8 text-center shadow-[0_0_24px_var(--color-accent-glow)]">
        <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Fee-Nance</p>
        <h1 className="mt-3 text-3xl leading-tight">Something went wrong</h1>
        <p className="mt-3 text-sm text-[var(--color-muted)]">
          The page hit an unexpected issue. You can try again or go back to dashboard.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)]"
          >
            Try Again
          </button>
          <Link
            href="/dashboard"
            className="rounded-md border border-[var(--color-border)] px-4 py-2 text-sm text-[var(--color-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </main>
  );
}
