"use client";

import * as React from "react";
import { type NodeProps } from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import { WireframePreviewIframe } from "@/components/console/wireframe/wireframe-preview-iframe";
import { useWireframeNavigation } from "@/lib/wireframe/navigation-context";
import { readWireframeJsx } from "@/lib/wireframe/read-wireframe";
import { useWireframeViewport } from "@/lib/wireframe/viewport-context";

export type WireframeNodePayload = {
  properties: Record<string, unknown>;
  onNavigateBySlug?: (slug: string) => void;
};

function stopFlowPointer(event: React.PointerEvent | React.MouseEvent) {
  event.stopPropagation();
}

function WireframeNodeComponent({ data }: NodeProps) {
  const payload = data as unknown as WireframeNodePayload;
  const { size, viewport } = useWireframeViewport();
  const nav = useWireframeNavigation();
  const onNavigateBySlugRef = React.useRef(payload.onNavigateBySlug);

  React.useEffect(() => {
    onNavigateBySlugRef.current = payload.onNavigateBySlug;
  }, [payload.onNavigateBySlug]);
  const jsx = React.useMemo(
    () => readWireframeJsx(payload.properties, viewport),
    [payload.properties, viewport],
  );
  const knownSlugs = React.useMemo(
    () => [...(nav?.knownSlugs ?? [])],
    [nav?.knownSlugs],
  );

  const handleNavigate = React.useCallback(
    (slug: string) => {
      onNavigateBySlugRef.current?.(slug);
      nav?.navigateTo(slug);
    },
    [nav],
  );

  return (
    <div
      className={cn(
        "nodrag nopan bg-background relative overflow-hidden rounded-xl border border-border shadow-lg shadow-black/5",
      )}
      style={{ width: size.width, height: size.height }}
      onPointerDown={stopFlowPointer}
      onMouseDown={stopFlowPointer}
    >
      <WireframePreviewIframe
        jsx={jsx}
        viewport={viewport}
        knownSlugs={knownSlugs}
        onNavigate={handleNavigate}
        width={size.width}
        height={size.height}
      />
    </div>
  );
}

export const WireframeFlowNode = React.memo(WireframeNodeComponent);
