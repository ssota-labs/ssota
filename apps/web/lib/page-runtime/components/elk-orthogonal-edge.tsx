"use client";

import * as React from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  Position,
  type EdgeProps,
} from "@xyflow/react";

export type ElkOrthogonalEdgeData = {
  /**
   * Optional ELK/synthetic waypoints. Endpoints are always overridden with
   * React Flow handle coords (`sourceX/Y`, `targetX/Y`) so the stroke meets
   * the visible Left/Right/Bottom handle dots.
   */
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
  const mid = Math.floor((points.length - 1) / 2);
  const a = points[mid]!;
  const b = points[mid + 1] ?? a;
  return { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
}

/** Both ends leave downward (feedback / reject_loop under the row). */
function isDownwardFeedback(
  sourcePosition: Position,
  targetPosition: Position,
  points: Array<{ x: number; y: number }> | undefined,
  sourceY: number,
  targetY: number,
): boolean {
  if (sourcePosition === Position.Bottom && targetPosition === Position.Bottom) {
    return true;
  }
  if (!points || points.length < 3) return false;
  const maxY = Math.max(...points.map((p) => p.y));
  return maxY > sourceY + 8 && maxY > targetY + 8;
}

/**
 * Build an orthogonal path that starts/ends exactly on RF handle coordinates.
 */
function pathAttachedToHandles(
  sourceX: number,
  sourceY: number,
  targetX: number,
  targetY: number,
  sourcePosition: Position,
  targetPosition: Position,
  points: Array<{ x: number; y: number }> | undefined,
): Array<{ x: number; y: number }> {
  const sh = { x: sourceX, y: sourceY };
  const th = { x: targetX, y: targetY };

  if (isDownwardFeedback(sourcePosition, targetPosition, points, sourceY, targetY)) {
    const laneFromPoints = points
      ? Math.max(...points.map((p) => p.y))
      : Math.max(sourceY, targetY) + 28;
    const laneY = Math.max(laneFromPoints, sourceY + 24, targetY + 24);
    return [sh, { x: sourceX, y: laneY }, { x: targetX, y: laneY }, th];
  }

  if (Math.abs(sourceY - targetY) < 1) {
    return [sh, th];
  }

  const midX = (sourceX + targetX) / 2;
  return [sh, { x: midX, y: sourceY }, { x: midX, y: targetY }, th];
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

  const attached = pathAttachedToHandles(
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    d.points,
  );
  const useAttached = Number.isFinite(sourceX) && Number.isFinite(targetX);
  const edgePath = useAttached ? pointsToPath(attached) : fallbackPath;
  const labelPos = useAttached
    ? midpoint(attached)
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
