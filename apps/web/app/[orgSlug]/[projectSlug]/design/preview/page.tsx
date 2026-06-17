import { DesignPreviewClient } from "@/components/console/design-studio/design-preview-client";
import type { StudioRenderMode } from "@ssota/studio-renderer";

export default async function DesignPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ mode?: string }>;
}) {
  const { mode: modeParam } = await searchParams;
  const mode: StudioRenderMode =
    modeParam === "published" ? "published" : "draft";

  return <DesignPreviewClient mode={mode} />;
}
