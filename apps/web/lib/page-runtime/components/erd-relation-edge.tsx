"use client";

import * as React from "react";
import {
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";
import type { ErdEnd } from "../erd-model";

/**
 * A relationship line with crow's-foot cardinality. Each end draws a marker from
 * the edge's `sourceEnd`/`targetEnd` ("one" = a single bar, "many" = a crow's
 * foot). The arrow/foot recolors with the line on hover/select, so — like
 * `FlowEdge` — each edge renders its own inline `<marker>` defs (a shared def
 * can't track per-edge interaction state).
 */

const EDGE_IDLE = "#94a3b8";
const EDGE_ACTIVE = "#6366f1";

export type ErdEdgeData = {
  sourceEnd: ErdEnd;
  targetEnd: ErdEnd;
  label?: string;
};

/** Crow's-foot / one-bar shape, drawn in marker space (origin = endpoint). */
function MarkerShape({ end, color }: { end: ErdEnd; color: string }) {
  const stroke = {
    stroke: color,
    fill: "none",
    strokeWidth: 1.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  if (end === "many") {
    // Three prongs splaying from a point out behind the line toward the node.
    return (
      <polyline points="-11,0 0,-6 0,0 -11,0 0,6" style={stroke} />
    );
  }
  // "one": a single perpendicular bar set back from the node border.
  return <line x1={-8} y1={-5} x2={-8} y2={5} style={stroke} />;
}

function ErdRelationEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = React.useState(false);
  const active = Boolean(selected) || hovered;
  const color = active ? EDGE_ACTIVE : EDGE_IDLE;
  const width = active ? 2 : 1.4;
  const { sourceEnd, targetEnd, label } = (data ?? {}) as ErdEdgeData;
  const state = active ? "on" : "off";
  const startId = `erd-start-${id}-${state}`;
  const endId = `erd-end-${id}-${state}`;

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 8,
  });

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <defs>
        <marker
          id={startId}
          markerWidth={16}
          markerHeight={16}
          viewBox="-16 -10 24 20"
          markerUnits="strokeWidth"
          orient="auto-start-reverse"
          refX={0}
          refY={0}
        >
          <MarkerShape end={sourceEnd ?? "one"} color={color} />
        </marker>
        <marker
          id={endId}
          markerWidth={16}
          markerHeight={16}
          viewBox="-16 -10 24 20"
          markerUnits="strokeWidth"
          orient="auto"
          refX={0}
          refY={0}
        >
          <MarkerShape end={targetEnd ?? "many"} color={color} />
        </marker>
      </defs>
      <path
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={width}
        markerStart={`url(#${startId})`}
        markerEnd={`url(#${endId})`}
      />
      {/* Invisible wide hit-area so the thin line is easy to hover/click. */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={16} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-background/90 text-muted-foreground absolute rounded border px-1 py-0.5 text-[9px] font-medium shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              borderColor: active ? EDGE_ACTIVE : undefined,
              color: active ? EDGE_ACTIVE : undefined,
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </g>
  );
}

export const ErdRelationEdge = React.memo(ErdRelationEdgeComponent);
