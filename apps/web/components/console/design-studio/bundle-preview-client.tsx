"use client";

import { BundlePreviewHost } from "@ssota/studio-preview-runtime/bundle-host";

export function BundlePreviewClient() {
  return <BundlePreviewHost initialInteractionMode="inspect" />;
}
