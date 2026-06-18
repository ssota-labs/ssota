"use client";

import type { UiComponentLayerIndexNode } from "@ssota/contracts/catalog";
import { cn } from "@/lib/utils";

type SourceLayersPanelProps = {
  layers: UiComponentLayerIndexNode[];
  selectedId: string | null;
  onSelect: (nodeId: string) => void;
  embedded?: boolean;
};

function flattenSourceLayers(
  nodes: UiComponentLayerIndexNode[],
  depth = 0,
): Array<{ id: string; label: string; depth: number }> {
  const items: Array<{ id: string; label: string; depth: number }> = [];
  for (const node of nodes) {
    items.push({ id: node.id, label: node.label, depth });
    if (node.children?.length) {
      items.push(...flattenSourceLayers(node.children, depth + 1));
    }
  }
  return items;
}

export function SourceLayersPanel({
  layers,
  selectedId,
  onSelect,
  embedded = false,
}: SourceLayersPanelProps) {
  const items = flattenSourceLayers(layers);

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
        {items.length === 0 ? (
          <p className="px-2 py-1 text-xs text-muted-foreground">
            No JSX layers in source files yet.
          </p>
        ) : null}
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            className={cn(
              "mb-0.5 flex w-full items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-mono hover:bg-muted",
              selectedId === item.id && "bg-muted font-semibold",
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
            <span className="truncate">{item.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
