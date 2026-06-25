"use client";

import * as React from "react";
import { getBezierPath, type EdgeProps } from "@xyflow/react";

/**
 * Custom edge so the arrowhead recolors together with the line on hover/select.
 * (A shared `markerEnd` def can't follow per-edge interaction state via CSS, so
 * each edge renders its own inline `<marker>` whose color tracks the active state.)
 */

const EDGE_IDLE = "#94a3b8";
const EDGE_ACTIVE = "#6366f1";

function FlowEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const [hovered, setHovered] = React.useState(false);
  const active = Boolean(selected) || hovered;
  const color = active ? EDGE_ACTIVE : EDGE_IDLE;
  const width = active ? 2.5 : 1.5;
  const markerId = `flow-arrow-${id}-${active ? "on" : "off"}`;

  const [edgePath] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <g
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <defs>
        <marker
          id={markerId}
          markerWidth={12}
          markerHeight={12}
          viewBox="-10 -10 20 20"
          markerUnits="strokeWidth"
          orient="auto-start-reverse"
          refX={0}
          refY={0}
        >
          <polyline
            points="-5,-4 0,0 -5,4 -5,-4"
            style={{
              stroke: color,
              fill: color,
              strokeWidth: 1,
              strokeLinecap: "round",
              strokeLinejoin: "round",
            }}
          />
        </marker>
      </defs>
      <path
        className="react-flow__edge-path"
        d={edgePath}
        fill="none"
        stroke={color}
        strokeWidth={width}
        markerEnd={`url(#${markerId})`}
      />
      {/* Invisible wide hit-area so the thin line is easy to hover/click. */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={16} />
    </g>
  );
}

export const FlowEdge = React.memo(FlowEdgeComponent);
