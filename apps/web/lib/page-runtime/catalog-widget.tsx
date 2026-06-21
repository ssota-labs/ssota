"use client";

import { useEffect, useRef, useState } from "react";
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
  componentProps,
  onBuild,
}: {
  data: ResolvedArtifact | undefined;
  basePath: string;
  height?: number;
  /** Literal props injected into the mounted component (newly-built only). */
  componentProps?: Record<string, unknown>;
  /** Triggers a server-side build for an unbuilt buildable node. */
  onBuild?: () => void | Promise<void>;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [building, setBuilding] = useState(false);
  const built = data?.status === "built" ? data : null;
  const propsKey = componentProps ? JSON.stringify(componentProps) : "";

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
      if (componentProps) {
        postToIframe(
          iframe,
          { type: "STUDIO_SET_PROPS", props: componentProps },
          origin,
        );
      }
    });
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
    // propsKey re-sends props when they change between renders.
  }, [built, propsKey, componentProps]);

  if (!built) {
    const nodeId = data?.status === "unbuilt" ? data.nodeId : undefined;
    return (
      <div className="border-border text-muted-foreground flex items-center justify-between gap-3 rounded-md border border-dashed p-4 text-sm">
        <span>Component not built yet.</span>
        {onBuild && nodeId ? (
          <button
            type="button"
            disabled={building}
            onClick={async () => {
              setBuilding(true);
              try {
                await onBuild();
              } finally {
                setBuilding(false);
              }
            }}
            className="bg-primary text-primary-foreground rounded-md px-3 py-1.5 text-xs font-medium disabled:opacity-50"
          >
            {building ? "Building…" : "Build now"}
          </button>
        ) : null}
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
