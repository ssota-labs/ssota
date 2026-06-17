"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";
import {
  collectStudioUtilityClassesFromBundle,
  createParentMessageListener,
  postToIframe,
  type ResolvedComponentMap,
  type StudioInteractionMode,
  type StudioMessage,
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
    highlightNode,
  };
}

function measureStudioNodePx(
  iframe: HTMLIFrameElement | null,
  nodeId: string,
): number | null {
  const doc = iframe?.contentDocument;
  if (!doc) return null;
  const el = doc.querySelector(`[data-studio-id="${CSS.escape(nodeId)}"]`);
  if (!el) return null;
  const { width, height } = el.getBoundingClientRect();
  const px = Math.min(width, height);
  return px > 0 ? Math.round(px) : null;
}

/** 선택 노드의 프리뷰 DOM 크기 — radius % 변환 기준으로 사용합니다. */
export function useStudioNodeMeasure(
  iframeRef: RefObject<HTMLIFrameElement | null>,
  nodeId: string | null,
  ready: boolean,
  /** className 등 변경 시 재측정 트리거 */
  measureKey: string,
): number | null {
  const [sizePx, setSizePx] = useState<number | null>(null);

  useEffect(() => {
    if (!ready || !nodeId) {
      setSizePx(null);
      return;
    }

    const measure = () => {
      setSizePx(measureStudioNodePx(iframeRef.current, nodeId));
    };

    measure();

    const doc = iframeRef.current?.contentDocument;
    const el = doc?.querySelector(`[data-studio-id="${CSS.escape(nodeId)}"]`);
    if (!el) return;

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [iframeRef, nodeId, ready, measureKey]);

  return sizePx;
}
