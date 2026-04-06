"use client";

import { useEffect } from "react";
import { logger } from "@/lib/logger";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    logger.error("Global app error boundary triggered", error, {
      digest: error.digest,
      source: "src/app/global-error.tsx",
    });
  }, [error]);

  return (
    <html lang="en">
      <body className="min-h-screen bg-[var(--color-bg)] px-5 py-12 text-[var(--color-text)] md:px-10">
        <main className="mx-auto w-full max-w-2xl rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] p-8 text-center shadow-[0_20px_80px_rgba(0,0,0,0.45)]">
          <p className="text-xs uppercase tracking-[0.24em] text-[var(--color-muted)]">Fee-Nance</p>
          <h1 className="mt-3 text-3xl leading-tight">Critical Error</h1>
          <p className="mt-3 text-sm text-[var(--color-muted)]">
            A critical rendering error occurred. Please retry the request.
          </p>
          <button
            type="button"
            onClick={reset}
            className="mt-6 rounded-md bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-[var(--color-accent-contrast)]"
          >
            Retry
          </button>
        </main>
      </body>
    </html>
  );
}
