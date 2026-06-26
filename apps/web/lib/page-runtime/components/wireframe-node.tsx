"use client";

import * as React from "react";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import {
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
} from "@/components/ai-elements/jsx-preview";
import { WIREFRAME_JSX_COMPONENTS } from "@/lib/wireframe/primitives";
import { readWireframeJsx } from "@/lib/wireframe/read-wireframe";

export const WIREFRAME_NODE_WIDTH = 300;
export const WIREFRAME_NODE_HEIGHT = 520;

export type WireframeNodePayload = {
  title: string;
  slug: string;
  properties: Record<string, unknown>;
  selected: boolean;
};

function WireframeNodeComponent({ data, selected }: NodeProps) {
  const payload = data as unknown as WireframeNodePayload;
  const jsx = React.useMemo(
    () => readWireframeJsx(payload.properties),
    [payload.properties],
  );

  return (
    <div
      className={cn(
        "relative bg-card overflow-hidden rounded-xl border shadow-sm transition-shadow",
        selected
          ? "border-primary ring-primary/30 ring-2 ring-offset-2 ring-offset-background"
          : "border-border",
      )}
      style={{ width: WIREFRAME_NODE_WIDTH, height: WIREFRAME_NODE_HEIGHT }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-background !border-muted-foreground/50 !h-2 !w-2 !border"
      />
      <div className="border-border bg-muted/20 flex items-center justify-between border-b px-2 py-1">
        <span className="truncate text-[10px] font-medium">{payload.title}</span>
        <span className="text-muted-foreground text-[9px]">{payload.slug}</span>
      </div>
      <div className="nodrag nopan h-[calc(100%-1.75rem)] overflow-hidden p-1">
        <JSXPreview jsx={jsx} components={WIREFRAME_JSX_COMPONENTS}>
          <JSXPreviewContent className="h-full overflow-auto text-xs" />
          <JSXPreviewError className="m-2" />
        </JSXPreview>
      </div>
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-background !border-muted-foreground/50 !h-2 !w-2 !border"
      />
    </div>
  );
}

export const WireframeFlowNode = React.memo(WireframeNodeComponent);
