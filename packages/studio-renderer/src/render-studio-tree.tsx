import type { MouseEvent, ReactNode } from "react";
import { createElement } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";

export type RenderStudioTreeOptions = {
  onSelect?: (nodeId: string) => void;
  highlightedNodeId?: string | null;
  interactionMode?: "inspect" | "preview";
};

export function renderStudioTree(
  node: StudioNode,
  options: RenderStudioTreeOptions = {},
): ReactNode {
  const {
    onSelect,
    highlightedNodeId,
    interactionMode = "inspect",
  } = options;
  const inspect = interactionMode === "inspect";

  const handleClick = (nodeId: string) => (event: MouseEvent) => {
    if (!inspect) return;
    event.stopPropagation();
    onSelect?.(nodeId);
  };

  const bindNode = (nodeId: string, props: Record<string, unknown>) => ({
    ...props,
    "data-studio-id": nodeId,
    "data-studio-selected":
      inspect && highlightedNodeId === nodeId ? "true" : undefined,
    onClick: handleClick(nodeId),
  });

  switch (node.kind) {
    case "text":
      return createElement(
        "span",
        bindNode(node.id, {}),
        node.text,
      );

    case "fragment":
      return createElement(
        "div",
        bindNode(node.id, { "data-studio-fragment": "true" }),
        node.children.map((child) =>
          createElement(
            "div",
            { key: child.id },
            renderStudioTree(child, options),
          ),
        ),
      );

    case "element": {
      const { tag, className, attributes, children, id } = node;
      return createElement(
        tag,
        bindNode(id, {
          ...attributes,
          className,
        }),
        children.map((child) =>
          createElement(
            "div",
            { key: child.id, style: { display: "contents" } },
            renderStudioTree(child, options),
          ),
        ),
      );
    }

    case "component":
      return createElement(
        "div",
        bindNode(node.id, {
          "data-studio-component-ref": node.ref.slug,
          className: node.className,
        }),
        node.children.map((child) =>
          createElement(
            "div",
            { key: child.id, style: { display: "contents" } },
            renderStudioTree(child, options),
          ),
        ),
      );
  }
}
