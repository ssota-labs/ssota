"use client";

import * as React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "@xyflow/react";

export type ElkOrthogonalEdgeData = {
  /** Absolute flow coords from ELK sections (same space as node positions). */
  points?: Array<{ x: number; y: number }>;
  kind?: string;
  label?: string;
};

function pointsToPath(points: Array<{ x: number; y: number }>): string {
  if (points.length === 0) return "";
  const first = points[0];
  if (!first) return "";
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length; i++) {
    const p = points[i]!;
    d += ` L ${p.x} ${p.y}`;
  }
  return d;
}

function midpoint(points: Array<{ x: number; y: number }>): { x: number; y: number } {
  if (points.length === 0) return { x: 0, y: 0 };
  if (points.length === 1) return points[0]!;
  // Prefer the middle segment midpoint so labels sit on the long run, not a corner.
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid]!;
  const b = points[mid + 1] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

function ElkOrthogonalEdgeComponent({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
  style,
  markerEnd,
  label: edgeLabel,
}: EdgeProps) {
  const d = (data ?? {}) as ElkOrthogonalEdgeData;
  const points = d.points;
  const label = d.label ?? (typeof edgeLabel === "string" ? edgeLabel : undefined);
  const kind = d.kind ?? "";

  const [fallbackPath, fallbackLabelX, fallbackLabelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    borderRadius: 12,
  });

  const useElk = Boolean(points && points.length >= 2);
  const edgePath = useElk ? pointsToPath(points!) : fallbackPath;
  const labelPos = useElk
    ? midpoint(points!)
    : { x: fallbackLabelX, y: fallbackLabelY };

  const stroke =
    (typeof style?.stroke === "string" ? style.stroke : undefined) ||
    (kind === "reject_loop" ? "var(--destructive)" : "var(--muted-foreground)");
  const dash =
    typeof style?.strokeDasharray === "string" ? style.strokeDasharray : undefined;

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        markerEnd={markerEnd}
        style={{
          ...style,
          stroke,
          strokeWidth: selected ? 2.25 : 1.5,
          strokeDasharray: dash,
        }}
      />
      {/* Invisible hit area */}
      <path d={edgePath} fill="none" stroke="transparent" strokeWidth={16} />
      {label ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan bg-card/90 text-muted-foreground absolute rounded px-1 py-0.5 text-[10px] font-medium shadow-sm"
            style={{
              transform: `translate(-50%, -50%) translate(${labelPos.x}px, ${labelPos.y}px)`,
              color:
                kind === "reject_loop"
                  ? "var(--destructive)"
                  : "var(--muted-foreground)",
              pointerEvents: "all",
            }}
          >
            {label}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
}

export const ElkOrthogonalEdge = React.memo(ElkOrthogonalEdgeComponent);
