"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  createParentMessageListener,
  postToParent,
} from "./bridge";
import { StudioInspectStyle } from "./inspect-styles";
import { StudioUtilityStyle } from "./utility-styles";
import type {
  StudioInteractionMode,
  StudioMessage,
  StudioSourceRef,
} from "./protocol";
import { applyStudioPatch } from "./patch-applier";

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

  await new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.type = "module";
    script.src = jsUrl;
    script.setAttribute(BUNDLE_ATTR, "true");
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load studio bundle: ${jsUrl}`));
    document.head.appendChild(script);
  });
}

function readSourceRef(element: HTMLElement): StudioSourceRef | undefined {
  const file = element.dataset.studioFile;
  const loc = element.dataset.studioLoc;
  if (file) {
    return { file, loc };
  }
  if (loc) {
    const fileFromLoc = loc.split(":")[0];
    if (fileFromLoc) {
      return { file: fileFromLoc, loc };
    }
  }
  return undefined;
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
  const [utilityCss, setUtilityCss] = useState("");
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
          case "STUDIO_SET_UTILITY_CSS":
            setUtilityCss(message.cssText);
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
    postToParent({ type: "STUDIO_READY" }, targetOrigin);
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
      <StudioUtilityStyle cssText={utilityCss} />
      <div id="studio-root" className="min-h-screen" />
    </div>
  );
}
