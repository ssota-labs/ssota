"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
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
  const { size, viewport } = useWireframeViewport();
  const jsx = React.useMemo(
    () => readWireframeJsx(payload.properties, viewport),
    [payload.properties, viewport],
  );

  return (
    <div
      className="nodrag nopan bg-background relative overflow-hidden rounded-xl border border-border shadow-lg shadow-black/5"
      style={{ width: size.width, height: size.height }}
      data-testid="wireframe-flow-node-shell"
    >
      <JSXPreview jsx={jsx} components={WIREFRAME_JSX_COMPONENTS}>
        <JSXPreviewContent className="h-full overflow-auto text-xs" />
        <JSXPreviewError className="m-3" />
      </JSXPreview>
    </div>
  );
}

export const WireframeFlowNode = React.memo(WireframeNodeComponent);
