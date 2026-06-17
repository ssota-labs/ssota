"use client";

import type { StudioNode } from "@ssota/contracts/catalog";
import { walkStudioNodes } from "@/lib/design-studio/tree-utils";
import { cn } from "@/lib/utils";
import { LayerNodeIcon } from "./layer-node-icon";

type LayersPanelProps = {
  root: StudioNode;
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  /** When nested inside studio-left-panel, skip outer chrome. */
  embedded?: boolean;
};

function nodeLabel(node: StudioNode): string {
  switch (node.kind) {
    case "element":
      return `<${node.tag}>`;
    case "component":
      return `@${node.ref.slug}`;
    case "text":
      return `"${node.text.slice(0, 24)}${node.text.length > 24 ? "…" : ""}"`;
    case "fragment":
      return "<>";
  }
}

export function LayersPanel({
  root,
  selectedId,
  onSelect,
  embedded = false,
}: LayersPanelProps) {
  const items: Array<{ id: string; label: string; depth: number; node: StudioNode }> =
    [];
  walkStudioNodes(root, (node, depth) => {
    items.push({ id: node.id, label: nodeLabel(node), depth, node });
  });

  return (
    <div
      className={
        embedded
          ? "flex h-full min-h-0 flex-col"
          : "flex h-full min-h-0 flex-col border-r bg-card"
      }
    >
      {!embedded ? (
        <div className="border-b px-3 py-2 text-sm font-medium">Layers</div>
      ) : null}
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-mono hover:bg-primary/8",
              selectedId === item.id && "bg-primary/16 font-medium text-foreground",
            )}
            style={{ paddingLeft: `${item.depth * 12 + 8}px` }}
            data-testid={`studio-layer-${item.id}`}
            onClick={() => {
              onSelect(item.id);
              window.dispatchEvent(
                new CustomEvent("studio-layer-select", {
                  detail: { nodeId: item.id },
                }),
              );
            }}
          >
            <LayerNodeIcon node={item.node} />
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
