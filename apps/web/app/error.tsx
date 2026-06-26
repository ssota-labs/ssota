"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";
import { Button } from "@ssota/ui/components/ui/button";

function isChunkLoadError(error: Error) {
  return (
    error.name === "ChunkLoadError" ||
    /failed to load chunk/i.test(error.message) ||
    /loading chunk \d+ failed/i.test(error.message)
  );
}

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    if (isChunkLoadError(error)) {
      window.location.reload();
      return;
    }
    Sentry.captureException(error);
  }, [error]);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6">
      <p className="text-sm text-muted-foreground">Something went wrong.</p>
      <Button onClick={() => reset()}>Try again</Button>
    </div>
  );
}
