"use client";

import * as React from "react";
import dynamic from "next/dynamic";
import { Handle, Position, type NodeProps } from "@xyflow/react";
import { cn } from "@ssota/ui/lib/utils";
import { flowColorClasses, flowGlowRgb } from "../flow-tokens";
import { interpolateCardSpec } from "../flow-card";
import { useAction } from "../context";
import type { ResolvedNodeStyle, FlowNodeStatus } from "../flow-model";
import type { RenderNode } from "../types";

// Lazy import breaks the static cycle flow-node → renderer → registry → flow-node.
const CardRenderer = dynamic(
  () => import("../renderer").then((m) => m.DynamicPageRenderer),
  { ssr: false },
);

/**
 * The single generic FlowNode. It renders every node in the canvas — its look is
 * driven entirely by the resolved variant (color/shape/title/badge), which the
 * `nodePresentation` manifest derives from the node's catalog type/properties.
 * No domain concepts live here.
 *
 * Visual language adapted from ssota-labs: Tailwind token surface/border/text,
 * a selection ring, and a triple drop-shadow glow (`shape/index.tsx`). The glow
 * is the one spot that needs a real rgb value (CSS filter), supplied by FLOW_GLOW_RGB.
 */

export type FlowNodePayload = {
  style: ResolvedNodeStyle;
  status?: FlowNodeStatus;
  /** LR/RL/TB/BT — picks which sides carry the source/target handles. */
  direction?: "LR" | "RL" | "TB" | "BT";
  /** Number of direct children (drives the collapse toggle). */
  childCount?: number;
  /** Whether this node's subtree is currently collapsed. */
  collapsed?: boolean;
  /** Toggle this node's subtree collapse. */
  onToggleCollapse?: () => void;
  /** The node as a RenderNode — bound + interpolated into the card template. */
  renderNode?: RenderNode;
  /** Shared canvas view state (panel toggles), read by the card via `{{view.*}}`. */
  view?: Record<string, unknown>;
};

const STATUS_BORDER: Record<FlowNodeStatus, string> = {
  loading: "border-blue-500",
  success: "border-emerald-600",
  error: "border-red-400",
};

function handlePositions(direction: FlowNodePayload["direction"]): {
  target: Position;
  source: Position;
} {
  switch (direction) {
    case "RL":
      return { target: Position.Right, source: Position.Left };
    case "TB":
      return { target: Position.Top, source: Position.Bottom };
    case "BT":
      return { target: Position.Bottom, source: Position.Top };
    case "LR":
    default:
      return { target: Position.Left, source: Position.Right };
  }
}

function FlowNodeComponent({ data, selected }: NodeProps) {
  const payload = data as unknown as FlowNodePayload;
  const {
    style,
    status,
    childCount = 0,
    collapsed,
    onToggleCollapse,
    renderNode,
    view,
  } = payload;
  const onAction = useAction();
  const colors = flowColorClasses(style.color);
  const isPill = style.shape === "pill";
  const isDiamond = style.shape === "diamond";
  const { target, source } = handlePositions(payload.direction);
  const [hovered, setHovered] = React.useState(false);

  // A node may render a card template (mini JSON-render) instead of the colored
  // box — interpolate `{{...}}` tokens + prune `when`-gated rows from the node's
  // properties and the shared view state.
  const cardSpec = React.useMemo(
    () =>
      style.card && renderNode
        ? interpolateCardSpec(style.card, {
            title: renderNode.title,
            ...renderNode.properties,
            view: view ?? {},
          })
        : null,
    [style.card, renderNode, view],
  );

  // Glow uses a real rgb (CSS filter can't take a Tailwind class). Selected gets
  // the full lift + glow; hover gets a lighter version; otherwise a subtle shadow.
  const glow = flowGlowRgb(style.color);
  const filter = selected
    ? `drop-shadow(0 1px 3px rgba(0,0,0,0.12)) drop-shadow(0 8px 14px rgba(0,0,0,0.12)) drop-shadow(0 0 5px ${glow})`
    : hovered
      ? `drop-shadow(0 1px 3px rgba(0,0,0,0.1)) drop-shadow(0 0 4px ${glow})`
      : "drop-shadow(0 1px 2px rgba(0,0,0,0.08))";

  const handleClass =
    "!h-2 !w-2 !border !bg-background !border-muted-foreground/50";

  return (
    <div
      style={{ filter }}
      className="relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Handle type="target" position={target} className={handleClass} />
      {cardSpec && renderNode ? (
        <div
          className={cn(
            "bg-card overflow-hidden rounded-xl border",
            status ? STATUS_BORDER[status] : "border-border",
            status ? "border-2" : "border",
            selected
              ? cn("ring-2 ring-offset-1 ring-offset-background", colors.ring)
              : hovered && cn("ring-1 ring-offset-1 ring-offset-background", colors.ring),
          )}
        >
          <div className="px-3 py-2 text-left text-xs [&_*]:cursor-default">
            <CardRenderer
              spec={cardSpec}
              bindingData={{ node: renderNode }}
              onAction={onAction}
            />
          </div>
        </div>
      ) : (
        <div
          className={cn(
            "flex min-h-[40px] min-w-[140px] max-w-[240px] items-center justify-center gap-2 border px-3 py-2 text-center text-xs font-medium transition-shadow",
            colors.surface,
            colors.text,
            status ? STATUS_BORDER[status] : colors.border,
            status ? "border-2" : "border",
            isPill ? "rounded-full" : "rounded-lg",
            selected
              ? cn("ring-2 ring-offset-1 ring-offset-background", colors.ring)
              : hovered && cn("ring-1 ring-offset-1 ring-offset-background", colors.ring),
            isDiamond && "rotate-45",
          )}
        >
          <div className={cn("flex flex-col items-center", isDiamond && "-rotate-45")}>
            <span className="leading-tight">{style.title}</span>
            {style.badge ? (
              <span className="mt-0.5 rounded bg-background/60 px-1 text-[10px] font-normal opacity-80">
                {style.badge}
              </span>
            ) : null}
          </div>
        </div>
      )}
      <Handle type="source" position={source} className={handleClass} />
      {childCount > 0 && onToggleCollapse ? (
        <button
          type="button"
          aria-label={collapsed ? "Expand subtree" : "Collapse subtree"}
          className="bg-background text-muted-foreground hover:text-foreground absolute -bottom-2.5 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border px-1.5 py-0.5 text-[10px] font-medium shadow-sm transition-colors nodrag"
          onMouseDown={(e) => e.stopPropagation()}
          onClick={(e) => {
            e.stopPropagation();
            onToggleCollapse();
          }}
        >
          <span>{childCount}</span>
          <span aria-hidden>{collapsed ? "▸" : "▾"}</span>
        </button>
      ) : null}
    </div>
  );
}

export const FlowNode = React.memo(FlowNodeComponent);
