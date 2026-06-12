"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type Edge,
  type EdgeProps,
} from "@xyflow/react";
import { cn } from "@loopos/ui/lib/utils";
import type { CatalogEdgeData } from "./build-schema-graph";

type CatalogFlowEdge = Edge<CatalogEdgeData, "catalogEdge">;

function ArrowMarker({ id, color }: { id: string; color: string }) {
  return (
    <marker
      id={id}
      markerWidth="20"
      markerHeight="20"
      viewBox="-10 -10 20 20"
      orient="auto-start-reverse"
      markerUnits="strokeWidth"
      refX="0"
      refY="0"
    >
      <polyline
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1"
        fill={color}
        points="-5,-4 0,0 -5,4 -5,-4"
      />
    </marker>
  );
}

export function CatalogEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<CatalogFlowEdge>) {
  const strokeColor = selected ? "var(--primary)" : "var(--muted-foreground)";
  const strokeWidth = selected ? 2 : 1.5;
  const markerEndId = `${id}-marker-end`;

  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <defs>
        <ArrowMarker id={markerEndId} color={strokeColor} />
      </defs>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={`url(#${markerEndId})`}
        style={{
          stroke: strokeColor,
          strokeWidth,
        }}
      />
      <EdgeLabelRenderer>
        <div
          className="nodrag nopan pointer-events-none"
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
          }}
        >
          <div
            className={cn(
              "rounded-md px-3 py-1.5 text-xs italic backdrop-blur-sm transition-all",
              selected
                ? "border border-border bg-background/90 text-foreground shadow-sm"
                : "bg-background/70 text-muted-foreground",
            )}
          >
            {data?.label ?? ""}
          </div>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
