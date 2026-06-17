"use client";

import { BundlePreviewHost } from "@ssota/studio-preview-runtime";

export function BundlePreviewClient() {
  return <BundlePreviewHost initialInteractionMode="inspect" />;
}
