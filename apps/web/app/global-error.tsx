"use client";

// Catches errors in the root layout that the regular error.tsx boundary can't
// reach, and forwards them to Sentry. Only rendered in production.
import * as Sentry from "@sentry/nextjs";
import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div
          style={{
            minHeight: "100svh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "system-ui, sans-serif",
            fontSize: "0.875rem",
          }}
        >
          Something went wrong.
        </div>
      </body>
    </html>
  );
}
