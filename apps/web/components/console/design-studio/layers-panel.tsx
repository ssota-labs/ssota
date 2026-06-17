"use client";

import type { StudioNode } from "@ssota/contracts/catalog";
import { walkStudioNodes } from "@/lib/design-studio/tree-utils";
import { cn } from "@/lib/utils";

type LayersPanelProps = {
  root: StudioNode;
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
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

export function LayersPanel({ root, selectedId, onSelect }: LayersPanelProps) {
  const items: Array<{ id: string; label: string; depth: number }> = [];
  walkStudioNodes(root, (node, depth) => {
    items.push({ id: node.id, label: nodeLabel(node), depth });
  });

  return (
    <div className="flex h-full min-h-0 flex-col border-r bg-card">
      <div className="border-b px-3 py-2 text-sm font-medium">Layers</div>
      <div className="min-h-0 flex-1 overflow-auto p-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "mb-0.5 block w-full rounded-md px-2 py-1 text-left text-xs font-mono hover:bg-muted",
              selectedId === item.id && "bg-muted font-semibold",
            )}
            style={{ paddingLeft: `${item.depth * 12 + 8}px` }}
            onClick={() => {
              onSelect(item.id);
              window.dispatchEvent(
                new CustomEvent("studio-layer-select", {
                  detail: { nodeId: item.id },
                }),
              );
            }}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
