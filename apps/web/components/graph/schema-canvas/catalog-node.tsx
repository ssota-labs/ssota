"use client";

import { Handle, Position, type Node, type NodeProps } from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import type { CatalogNodeData } from "./build-schema-graph";

export function CatalogNode({
  data,
  selected,
}: NodeProps<Node<CatalogNodeData>>) {
  return (
    <div
      className={cn(
        "w-[200px] rounded-lg border bg-background/95 shadow-sm backdrop-blur-sm transition-shadow",
        selected
          ? "border-primary ring-2 ring-primary/20 shadow-md"
          : "border-border hover:border-muted-foreground/40 hover:shadow-md",
      )}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!h-2 !w-2 !border-2 !border-background !bg-sky-500/80"
      />
      <div className="border-b px-3 py-2">
        <p className="truncate text-sm font-semibold text-foreground">{data.label}</p>
        <p className="truncate font-mono text-[10px] text-muted-foreground">{data.nodeType}</p>
      </div>
      <div className="flex items-center justify-between px-3 py-2 text-[10px] text-muted-foreground">
        <span className="rounded bg-muted px-1.5 py-0.5">{data.family}</span>
        <span>
          {data.propertyCount} props · {data.actionCount} actions
        </span>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!h-2 !w-2 !border-2 !border-background !bg-sky-500/80"
      />
    </div>
  );
}
