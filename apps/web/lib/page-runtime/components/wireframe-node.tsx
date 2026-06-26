"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import {
  JSXPreview,
  JSXPreviewContent,
  JSXPreviewError,
} from "@/components/ai-elements/jsx-preview";
import { WIREFRAME_JSX_COMPONENTS } from "@/lib/wireframe/primitives";
import { readWireframeJsx } from "@/lib/wireframe/read-wireframe";

export const WIREFRAME_NODE_WIDTH = 360;
export const WIREFRAME_NODE_HEIGHT = 640;

export type WireframeNodePayload = {
  title: string;
  slug: string;
  properties: Record<string, unknown>;
};

function WireframeNodeComponent({ data }: NodeProps) {
  const payload = data as unknown as WireframeNodePayload;
  const jsx = React.useMemo(
    () => readWireframeJsx(payload.properties),
    [payload.properties],
  );

  return (
    <div
      className={cn(
        "bg-card relative overflow-hidden rounded-xl border border-border shadow-md",
      )}
      style={{ width: WIREFRAME_NODE_WIDTH, height: WIREFRAME_NODE_HEIGHT }}
    >
      <div className="border-border bg-muted/20 flex items-center justify-between border-b px-3 py-1.5">
        <span className="truncate text-xs font-medium">{payload.title}</span>
        <span className="text-muted-foreground text-[10px]">{payload.slug}</span>
      </div>
      <div className="nodrag nopan h-[calc(100%-2rem)] overflow-hidden p-2">
        <JSXPreview jsx={jsx} components={WIREFRAME_JSX_COMPONENTS}>
          <JSXPreviewContent className="h-full overflow-auto text-xs" />
          <JSXPreviewError className="m-2" />
        </JSXPreview>
      </div>
    </div>
  );
}

export const WireframeFlowNode = React.memo(WireframeNodeComponent);
