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
import { useWireframeViewport } from "@/lib/wireframe/viewport-context";

export type WireframeNodePayload = {
  properties: Record<string, unknown>;
};

function WireframeNodeComponent({ data }: NodeProps) {
  const payload = data as unknown as WireframeNodePayload;
  const { size } = useWireframeViewport();
  const jsx = React.useMemo(
    () => readWireframeJsx(payload.properties),
    [payload.properties],
  );

  return (
    <div
      className={cn(
        "bg-background relative overflow-hidden rounded-xl border border-border shadow-lg shadow-black/5",
      )}
      style={{ width: size.width, height: size.height }}
    >
      <div className="nodrag nopan h-full overflow-hidden">
        <JSXPreview jsx={jsx} components={WIREFRAME_JSX_COMPONENTS}>
          <JSXPreviewContent className="h-full overflow-auto text-xs" />
          <JSXPreviewError className="m-3" />
        </JSXPreview>
      </div>
    </div>
  );
}

export const WireframeFlowNode = React.memo(WireframeNodeComponent);
