"use client";

import Link from "next/link";
import { useEffect } from "react";
import { AlertTriangle, Home, RefreshCw } from "lucide-react";

import { logger } from "@/lib/logger";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Card className="w-full max-w-md p-8 text-center">
        <span
          aria-hidden="true"
          className="mx-auto flex size-12 items-center justify-center rounded-full bg-destructive-subtle text-destructive"
        >
          <AlertTriangle className="size-6" />
        </span>

        <h1 className="mt-5 font-display text-2xl">Something went wrong</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page hit an unexpected error. Retrying usually clears it — if it
          keeps happening, head back to your dashboard.
        </p>

        {error.digest && (
          <p className="mt-3 font-mono text-xs text-muted-foreground">
            Reference: {error.digest}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <Button onClick={reset}>
            <RefreshCw className="size-4" />
            Try again
          </Button>
          <Button variant="outline" asChild>
            <Link href="/dashboard">
              <Home className="size-4" />
              Go to dashboard
            </Link>
          </Button>
        </div>
      </Card>
    </main>
  );
}
