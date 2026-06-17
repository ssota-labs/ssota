"use client";

import { StudioPreview } from "@ssota/studio-renderer";
import type { StudioRenderMode } from "@ssota/studio-renderer";

export function DesignPreviewClient({
  mode,
}: {
  mode: StudioRenderMode;
}) {
  return (
    <div className="min-h-screen bg-background">
      <StudioPreview initialMode={mode} initialInteractionMode="inspect" />
    </div>
  );
}
