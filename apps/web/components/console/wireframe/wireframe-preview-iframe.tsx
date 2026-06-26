"use client";

import * as React from "react";
import {
  isWireframeChildMessage,
  postWireframeToIframe,
  type WireframeParentMessage,
} from "@/lib/wireframe/embed-messages";
import type { WireframeViewport } from "@/lib/wireframe/viewport";

type WireframePreviewIframeProps = {
  jsx: string;
  viewport: WireframeViewport;
  knownSlugs: string[];
  onNavigate: (slug: string) => void;
  width: number;
  height: number;
};

export function WireframePreviewIframe({
  jsx,
  viewport,
  knownSlugs,
  onNavigate,
  width,
  height,
}: WireframePreviewIframeProps) {
  const iframeRef = React.useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = React.useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  const embedSrc = `${origin}/wireframe/embed`;

  const pushInit = React.useCallback(() => {
    const message: WireframeParentMessage = {
      type: "WIREFRAME_INIT",
      jsx,
      viewport,
      knownSlugs,
    };
    postWireframeToIframe(iframeRef.current, message, origin);
  }, [jsx, viewport, knownSlugs, origin]);

  React.useEffect(() => {
    if (!origin) return;

    const listener = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (!isWireframeChildMessage(event.data)) return;

      if (event.data.type === "WIREFRAME_EMBED_READY") {
        setReady(true);
      }
      if (event.data.type === "WIREFRAME_NAVIGATE") {
        onNavigate(event.data.slug);
      }
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [origin, onNavigate]);

  React.useEffect(() => {
    if (!ready) return;
    pushInit();
  }, [ready, pushInit]);

  return (
    <iframe
      ref={iframeRef}
      src={embedSrc}
      title="Wireframe preview"
      sandbox="allow-scripts allow-same-origin"
      className="bg-background block border-0"
      style={{ width, height }}
      data-testid="wireframe-preview-iframe"
    />
  );
}
