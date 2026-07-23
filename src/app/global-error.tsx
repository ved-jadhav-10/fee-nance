"use client";

import { useEffect } from "react";

import { logger } from "@/lib/logger";

/**
 * Replaces the root layout entirely when it fails, so the app's stylesheet is
 * not guaranteed to be loaded here. Everything below is inline-styled, with a
 * `prefers-color-scheme` block so it stays readable in both themes.
 */
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
      <body
        style={{
          margin: 0,
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          background: "#fbfaff",
          color: "#14121f",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          lineHeight: 1.6,
        }}
      >
        <style>{`
          @media (prefers-color-scheme: dark) {
            body { background: #0b0a14 !important; color: #f2f1f9 !important; }
            .ge-card { background: #14121f !important; border-color: #2a2540 !important; }
            .ge-muted { color: #a8a3d0 !important; }
            .ge-btn { background: #8b82e8 !important; color: #120f24 !important; }
          }
          .ge-btn:focus-visible { outline: 2px solid #534ab7; outline-offset: 2px; }
        `}</style>

        <main
          className="ge-card"
          style={{
            width: "100%",
            maxWidth: "28rem",
            padding: "2rem",
            textAlign: "center",
            background: "#ffffff",
            border: "1px solid #e4e0f2",
            borderRadius: "0.75rem",
          }}
        >
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 600 }}>
            Fee-Nance couldn&rsquo;t load
          </h1>
          <p
            className="ge-muted"
            style={{ marginTop: "0.5rem", fontSize: "0.875rem", color: "#605c75" }}
          >
            A critical rendering error stopped the app from starting. Retrying
            usually clears it.
          </p>

          {error.digest && (
            <p
              className="ge-muted"
              style={{
                marginTop: "0.75rem",
                fontSize: "0.75rem",
                fontFamily: "ui-monospace, monospace",
                color: "#605c75",
              }}
            >
              Reference: {error.digest}
            </p>
          )}

          <button
            type="button"
            onClick={reset}
            className="ge-btn"
            style={{
              marginTop: "1.5rem",
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              fontSize: "0.875rem",
              fontWeight: 500,
              color: "#ffffff",
              background: "#534ab7",
              border: "none",
              borderRadius: "0.375rem",
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
