"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createParentMessageListener,
  postToParent,
} from "./bridge.js";
import { StudioInspectStyle } from "./inspect-styles.js";
import type {
  StudioInteractionMode,
  StudioMessage,
  StudioSourceRef,
} from "./protocol.js";
import { applyStudioPatch } from "./patch-applier.js";

const BUNDLE_ATTR = "data-studio-bundle-asset";

async function loadBundle(jsUrl: string, cssUrl?: string) {
  document
    .querySelectorAll(`[${BUNDLE_ATTR}]`)
    .forEach((node) => node.remove());

  if (cssUrl) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = cssUrl;
    link.setAttribute(BUNDLE_ATTR, "true");
    document.head.appendChild(link);
  }

  await import(/* @vite-ignore */ jsUrl);
}

function readSourceRef(element: HTMLElement): StudioSourceRef | undefined {
  const file = element.dataset.studioFile;
  if (!file) return undefined;
  return {
    file,
    loc: element.dataset.studioLoc,
  };
}

export type BundlePreviewHostProps = {
  targetOrigin?: string;
  initialInteractionMode?: StudioInteractionMode;
};

export function BundlePreviewHost({
  targetOrigin = typeof window !== "undefined" ? window.location.origin : "",
  initialInteractionMode = "inspect",
}: BundlePreviewHostProps) {
  const [interactionMode, setInteractionMode] =
    useState<StudioInteractionMode>(initialInteractionMode);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const loadedBuildIdRef = useRef<string | null>(null);

  const handleSelect = useCallback(
    (nodeId: string, sourceRef?: StudioSourceRef) => {
      setSelectedNodeId(nodeId);
      postToParent({ type: "STUDIO_SELECT", nodeId, sourceRef }, targetOrigin);
    },
    [targetOrigin],
  );

  useEffect(() => {
    postToParent({ type: "STUDIO_READY" }, targetOrigin);
  }, [targetOrigin]);

  useEffect(() => {
    const listener = createParentMessageListener(
      targetOrigin,
      async (message: StudioMessage) => {
        switch (message.type) {
          case "STUDIO_LOAD_BUNDLE":
            if (loadedBuildIdRef.current === message.buildId) {
              break;
            }
            await loadBundle(message.jsUrl, message.cssUrl);
            loadedBuildIdRef.current = message.buildId;
            break;
          case "STUDIO_SET_INTERACTION_MODE":
            setInteractionMode(message.mode);
            break;
          case "STUDIO_PATCH":
          case "STUDIO_PATCH_NODE":
            applyStudioPatch(message.nodeId, message.patch);
            break;
          case "STUDIO_HIGHLIGHT":
            setSelectedNodeId(message.nodeId);
            break;
          default:
            break;
        }
      },
    );
    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [targetOrigin]);

  useEffect(() => {
    if (interactionMode !== "inspect") return;

    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;
      const studioNode = target.closest("[data-studio-id]");
      if (!(studioNode instanceof HTMLElement)) return;
      event.preventDefault();
      event.stopPropagation();
      const nodeId = studioNode.dataset.studioId;
      if (!nodeId) return;
      handleSelect(nodeId, readSourceRef(studioNode));
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [interactionMode, handleSelect]);

  useEffect(() => {
    document
      .querySelectorAll("[data-studio-id][data-studio-selected]")
      .forEach((node) => node.removeAttribute("data-studio-selected"));
    if (!selectedNodeId) return;
    const selected = document.querySelector(
      `[data-studio-id="${selectedNodeId}"]`,
    );
    selected?.setAttribute("data-studio-selected", "true");
  }, [selectedNodeId]);

  return (
    <div
      className={
        interactionMode === "inspect"
          ? "studio-inspect-mode min-h-screen bg-background"
          : "min-h-screen bg-background"
      }
    >
      <StudioInspectStyle />
      <div id="studio-root" className="min-h-screen" />
    </div>
  );
}
