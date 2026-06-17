"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";
import {
  createParentMessageListener,
  postToIframe,
  type StudioMessage,
} from "@ssota/studio-renderer";

export function usePreviewBridge(previewUrl: string) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [ready, setReady] = useState(false);
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    const listener = createParentMessageListener(origin, (message) => {
      if (message.type === "STUDIO_READY") {
        setReady(true);
      }
      if (message.type === "STUDIO_SELECT") {
        window.dispatchEvent(
          new CustomEvent("studio-select", {
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
      post({ type: "STUDIO_SET_TREE", tree, mode: "draft" });
    },
    [post],
  );

  const syncTheme = useCallback(
    (cssText: string) => {
      post({ type: "STUDIO_SET_THEME", cssText });
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
    syncTheme,
    highlightNode,
  };
}
