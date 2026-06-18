"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";
import type { StudioPatch, StudioMessage } from "@ssota/studio-preview-runtime";
import {
  collectStudioUtilityClassesFromBundle,
  createParentMessageListener,
  postToIframe,
  type ResolvedComponentMap,
  type StudioInteractionMode,
} from "@ssota/studio-renderer";

async function fetchPreviewUtilityCss(classes: string[]): Promise<string> {
  if (classes.length === 0) return "";
  const response = await fetch("/api/studio/preview-utilities", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classes }),
  });
  if (!response.ok) return "";
  return response.text();
}

export function usePreviewBridge(previewUrl: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    setReady(false);
  }, [previewUrl]);

  useEffect(() => {
    const listener = createParentMessageListener(origin, (message) => {
      if (message.type === "STUDIO_READY") {
        setReady(true);
      }
      if (message.type === "STUDIO_SELECT") {
        window.dispatchEvent(
          new CustomEvent("studio-select", {
            detail: {
              nodeId: message.nodeId,
              sourceRef: message.sourceRef,
            },
          }),
        );
        window.dispatchEvent(
          new CustomEvent("studio-layer-select", {
            detail: { nodeId: message.nodeId },
          }),
        );
      }
    });
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [origin]);

  const post = useCallback(
    (message: StudioMessage) => {
      postToIframe(iframeRef.current, message, origin);
    },
    [origin],
  );

  const syncTree = useCallback(
    (tree: StudioNode) => {
      post({
        type: "STUDIO_SET_TREE",
        tree,
        mode: "draft",
      });
    },
    [post],
  );

  const syncResolvedComponents = useCallback(
    (resolvedComponents: ResolvedComponentMap) => {
      post({
        type: "STUDIO_SET_RESOLVED_COMPONENTS",
        resolvedComponents,
      });
    },
    [post],
  );

  const syncUtilityCss = useCallback(
    async (tree: StudioNode, resolvedComponents: ResolvedComponentMap) => {
      const classes = collectStudioUtilityClassesFromBundle(
        tree,
        resolvedComponents,
      );
      const cssText = await fetchPreviewUtilityCss(classes);
      post({ type: "STUDIO_SET_UTILITY_CSS", cssText });
    },
    [post],
  );

  const syncTheme = useCallback(
    (cssText: string) => {
      post({ type: "STUDIO_SET_THEME", cssText });
    },
    [post],
  );

  const syncInteractionMode = useCallback(
    (mode: StudioInteractionMode) => {
      post({ type: "STUDIO_SET_INTERACTION_MODE", mode });
    },
    [post],
  );

  const syncBundle = useCallback(
    (input: { jsUrl: string; cssUrl?: string; buildId: string }) => {
      post({
        type: "STUDIO_LOAD_BUNDLE",
        jsUrl: input.jsUrl,
        cssUrl: input.cssUrl,
        buildId: input.buildId,
      });
    },
    [post],
  );

  const patchNode = useCallback(
    (nodeId: string, patch: StudioPatch) => {
      post({ type: "STUDIO_PATCH", nodeId, patch });
    },
    [post],
  );

  const highlightNode = useCallback(
    (nodeId: string) => {
      post({ type: "STUDIO_HIGHLIGHT", nodeId });
    },
    [post],
  );

  useEffect(() => {
    if (!ready) return;
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ nodeId: string }>).detail;
      highlightNode(detail.nodeId);
    };
    window.addEventListener("studio-layer-select", handler);
    return () => window.removeEventListener("studio-layer-select", handler);
  }, [ready, highlightNode]);

  return {
    iframeRef,
    ready,
    previewUrl,
    syncTree,
    syncResolvedComponents,
    syncUtilityCss,
    syncTheme,
    syncInteractionMode,
    syncBundle,
    patchNode,
    highlightNode,
  };
}
