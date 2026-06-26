"use client";

import * as React from "react";
import {
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
} from "@/components/ai-elements/jsx-preview";
import {
  isWireframeParentMessage,
  postWireframeToParent,
} from "@/lib/wireframe/embed-messages";
import { WireframeNavigationProvider } from "@/lib/wireframe/navigation-context";
import { WIREFRAME_JSX_COMPONENTS } from "@/lib/wireframe/primitives";
import type { WireframeViewport } from "@/lib/wireframe/viewport";
import { WireframeViewportProvider } from "@/lib/wireframe/viewport-context";

type EmbedState = {
  jsx: string;
  viewport: WireframeViewport;
  knownSlugs: string[];
};

export function WireframeEmbedClient() {
  const [state, setState] = React.useState<EmbedState | null>(null);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  React.useEffect(() => {
    if (!origin) return;

    const listener = (event: MessageEvent) => {
      if (event.origin !== origin) return;
      if (!isWireframeParentMessage(event.data)) return;
      setState({
        jsx: event.data.jsx,
        viewport: event.data.viewport,
        knownSlugs: event.data.knownSlugs,
      });
    };

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [origin]);

  React.useEffect(() => {
    if (!origin || state) return;

    const announceReady = () => {
      postWireframeToParent({ type: "WIREFRAME_EMBED_READY" }, origin);
    };

    announceReady();
    const readyInterval = window.setInterval(announceReady, 250);
    return () => window.clearInterval(readyInterval);
  }, [origin, state]);

  if (!state) {
    return (
      <div
        className="bg-muted/20 h-full w-full"
        data-testid="wireframe-embed-loading"
      />
    );
  }

  const slugToNodeId = Object.fromEntries(
    state.knownSlugs.map((slug) => [slug, slug]),
  );

  return (
    <WireframeViewportProvider viewport={state.viewport}>
      <WireframeNavigationProvider
        slugToNodeId={slugToNodeId}
        onNavigate={(_nodeId, slug) => {
          postWireframeToParent({ type: "WIREFRAME_NAVIGATE", slug }, origin);
        }}
      >
        <div className="h-full w-full overflow-auto" data-testid="wireframe-embed-root">
          <JSXPreview jsx={state.jsx} components={WIREFRAME_JSX_COMPONENTS}>
            <JSXPreviewContent className="min-h-dvh text-xs" />
            <JSXPreviewError className="m-3" />
          </JSXPreview>
        </div>
      </WireframeNavigationProvider>
    </WireframeViewportProvider>
  );
}
