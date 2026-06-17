"use client";

import { useCallback, useEffect, useState } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";
import { postToParent } from "./bridge.js";
import type { StudioMessage } from "./protocol.js";
import { createParentMessageListener } from "./bridge.js";
import { renderStudioTree } from "./render-studio-tree.js";
import { StudioThemeStyle, STUDIO_PREVIEW_CLASS } from "./theme-inject.js";
import type { ResolvedComponentMap } from "./resolve-project-ref.js";
import { inlineProjectRefs } from "./resolve-project-ref.js";
import type { StudioRenderMode } from "./protocol.js";

export type StudioPreviewProps = {
  initialTree?: StudioNode | null;
  initialMode?: StudioRenderMode;
  initialThemeCss?: string;
  resolvedComponents?: ResolvedComponentMap;
  targetOrigin?: string;
};

export function StudioPreview({
  initialTree = null,
  initialMode = "draft",
  initialThemeCss = "",
  resolvedComponents = {},
  targetOrigin = typeof window !== "undefined" ? window.location.origin : "",
}: StudioPreviewProps) {
  const [tree, setTree] = useState<StudioNode | null>(initialTree);
  const [mode, setMode] = useState<StudioRenderMode>(initialMode);
  const [themeCss, setThemeCss] = useState(initialThemeCss);
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(
    null,
  );

  const handleSelect = useCallback(
    (nodeId: string) => {
      postToParent({ type: "STUDIO_SELECT", nodeId }, targetOrigin);
    },
    [targetOrigin],
  );

  useEffect(() => {
    postToParent({ type: "STUDIO_READY" }, targetOrigin);
  }, [targetOrigin]);

  useEffect(() => {
    const listener = createParentMessageListener(
      targetOrigin,
      (message: StudioMessage) => {
        switch (message.type) {
          case "STUDIO_SET_TREE":
            setTree(message.tree);
            setMode(message.mode);
            break;
          case "STUDIO_SET_THEME":
            setThemeCss(message.cssText);
            break;
          case "STUDIO_HIGHLIGHT":
            setHighlightedNodeId(message.nodeId);
            break;
          case "STUDIO_PATCH_NODE":
            setTree((current) =>
              current ? patchNode(current, message.nodeId, message.patch) : current,
            );
            break;
          default:
            break;
        }
      },
    );

    window.addEventListener("message", listener);
    return () => window.removeEventListener("message", listener);
  }, [targetOrigin]);

  const displayTree =
    tree && mode === "published"
      ? inlineProjectRefs(tree, resolvedComponents)
      : tree;

  return (
    <div className={`${STUDIO_PREVIEW_CLASS} min-h-full bg-background p-8`}>
      <StudioThemeStyle cssText={themeCss} />
      {displayTree ? (
        renderStudioTree(displayTree, {
          onSelect: handleSelect,
          highlightedNodeId,
        })
      ) : (
        <div className="text-muted-foreground text-sm">No preview tree</div>
      )}
    </div>
  );
}

function patchNode(
  node: StudioNode,
  nodeId: string,
  patch: {
    className?: string;
    tag?: string;
    text?: string;
    attributes?: Record<string, string>;
    props?: Record<string, unknown>;
  },
): StudioNode {
  if (node.id === nodeId) {
    if (node.kind === "element") {
      return {
        ...node,
        className: patch.className ?? node.className,
        tag: patch.tag ?? node.tag,
        attributes: patch.attributes ?? node.attributes,
      };
    }
    if (node.kind === "text") {
      return { ...node, text: patch.text ?? node.text };
    }
    if (node.kind === "component") {
      return {
        ...node,
        className: patch.className ?? node.className,
        props: patch.props ?? node.props,
      };
    }
    return node;
  }

  if (node.kind === "element" || node.kind === "fragment" || node.kind === "component") {
    return {
      ...node,
      children: node.children.map((child) => patchNode(child, nodeId, patch)),
    };
  }

  return node;
}
