"use client";

import { useEffect, useRef } from "react";
import { createParentMessageListener, postToIframe } from "@ssota/studio-renderer";
import type { ResolvedArtifact } from "@/lib/design-studio/resolve-artifact-binding";

/**
 * Renders a built component artifact (`Widget` catalog element) in a sandboxed
 * iframe via the shared BundlePreviewHost (preview mode, read-only). The host
 * posts STUDIO_READY; we reply with theme + bundle. Unbuilt artifacts show a
 * placeholder. Domain-agnostic: any node carrying a build can be a Widget.
 */
export function WidgetEl({
  data,
  basePath,
  height = 360,
}: {
  data: ResolvedArtifact | undefined;
  basePath: string;
  height?: number;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const built = data?.status === "built" ? data : null;

  useEffect(() => {
    if (!built) return;
    const origin = window.location.origin;
    const listener = createParentMessageListener(origin, (message) => {
      if (message.type !== "STUDIO_READY") return;
      const iframe = iframeRef.current;
      if (!iframe) return;
      postToIframe(
        iframe,
        { type: "STUDIO_SET_INTERACTION_MODE", mode: "preview" },
        origin,
      );
      if (built.themeCss) {
        postToIframe(
          iframe,
          { type: "STUDIO_SET_THEME", cssText: built.themeCss },
          origin,
        );
      }
      postToIframe(
        iframe,
        {
          type: "STUDIO_LOAD_BUNDLE",
          jsUrl: built.jsUrl,
          cssUrl: built.cssUrl,
          buildId: built.buildId,
        },
        origin,
      );
    });
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [built]);

  if (!built) {
    return (
      <div className="border-border text-muted-foreground rounded-md border border-dashed p-4 text-sm">
        Component not built yet.
      </div>
    );
  }

  return (
    <iframe
      ref={iframeRef}
      src={`${basePath}/design/preview`}
      title="Component preview"
      sandbox="allow-scripts allow-same-origin"
      className="border-border w-full rounded-md border"
      style={{ height }}
    />
  );
}
