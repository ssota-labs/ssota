import type { CSSProperties, MouseEvent, ReactNode } from "react";
import { createElement } from "react";
import type { StudioNode } from "@ssota/contracts/catalog";

export type RenderStudioTreeOptions = {
  onSelect?: (nodeId: string) => void;
  highlightedNodeId?: string | null;
};

export function renderStudioTree(
  node: StudioNode,
  options: RenderStudioTreeOptions = {},
): ReactNode {
  const { onSelect, highlightedNodeId } = options;

  const handleClick = (nodeId: string) => (event: MouseEvent) => {
    event.stopPropagation();
    onSelect?.(nodeId);
  };

  const highlightStyle = (nodeId: string): CSSProperties | undefined =>
    highlightedNodeId === nodeId
      ? { outline: "2px solid hsl(var(--primary))", outlineOffset: "2px" }
      : undefined;

  switch (node.kind) {
    case "text":
      return createElement(
        "span",
        {
          "data-studio-id": node.id,
          style: highlightStyle(node.id),
          onClick: handleClick(node.id),
        },
        node.text,
      );

    case "fragment":
      return createElement(
        "div",
        {
          "data-studio-id": node.id,
          "data-studio-fragment": "true",
          style: highlightStyle(node.id),
          onClick: handleClick(node.id),
        },
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
        {
          ...attributes,
          "data-studio-id": id,
          className,
          style: highlightStyle(id),
          onClick: handleClick(id),
        },
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
        {
          "data-studio-id": node.id,
          "data-studio-component-ref": node.ref.slug,
          className: node.className,
          style: highlightStyle(node.id),
          onClick: handleClick(node.id),
        },
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
