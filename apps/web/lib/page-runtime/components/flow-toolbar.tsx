"use client";

import * as React from "react";
import { Panel, useReactFlow, useViewport } from "@xyflow/react";
import {
  ArrowsOutIcon,
  LockSimpleIcon,
  LockSimpleOpenIcon,
  MagnifyingGlassMinusIcon,
  MagnifyingGlassPlusIcon,
} from "@phosphor-icons/react";
import { Button } from "@ssota/ui/components/ui/button";
import { Separator } from "@ssota/ui/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { cn } from "@ssota/ui/lib/utils";

/**
 * Floating toolbar surfaces for the flow canvas, ported from the legacy ssota
 * canvas (`ToolbarContainer` + `ToolbarIconButton`): a translucent, blurred,
 * bordered pill holding square ghost icon buttons. `nodrag nowheel` + the wheel
 * stop keep canvas pan/zoom from firing while interacting with the toolbar.
 */
export function ToolbarContainer({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={cn(
        "nodrag nowheel bg-background/90 border-border flex items-center justify-center gap-0.5 rounded-md border px-1.5 py-1 shadow-lg backdrop-blur-md",
        className,
      )}
      style={{ touchAction: "none" }}
      onWheel={(e) => e.stopPropagation()}
    >
      {children}
    </div>
  );
}

/** Square ghost icon button + tooltip; `isActive` flips it to the secondary fill. */
export function ToolbarIconButton({
  icon,
  tooltip,
  onClick,
  isActive = false,
  disabled = false,
  ariaLabel,
}: {
  icon: React.ReactNode;
  tooltip: string;
  onClick: () => void;
  isActive?: boolean;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            type="button"
            variant={isActive ? "secondary" : "ghost"}
            size="icon-sm"
            className="size-8 rounded-sm"
            onClick={onClick}
            disabled={disabled}
            aria-label={ariaLabel}
            aria-pressed={isActive}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent side="top" sideOffset={5}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

/**
 * Top-center interaction toolbar: fit-to-view + a pan/zoom lock toggle.
 * (The catalog flow is read-only — no node creation or selection modes — so this
 * carries the view/interaction tools that actually apply here.)
 */
export function FlowTopToolbar({
  locked,
  onToggleLock,
}: {
  locked: boolean;
  onToggleLock: () => void;
}) {
  const { fitView } = useReactFlow();
  return (
    <Panel position="top-center" className="pointer-events-auto! mt-3! z-10">
      <ToolbarContainer>
        <TooltipProvider delay={0}>
          <ToolbarIconButton
            icon={<ArrowsOutIcon className="size-4" />}
            tooltip="Fit to View"
            ariaLabel="Fit to View"
            onClick={() => void fitView({ padding: 0.15, duration: 250 })}
          />
          <ToolbarIconButton
            icon={
              locked ? (
                <LockSimpleIcon className="size-4" />
              ) : (
                <LockSimpleOpenIcon className="size-4" />
              )
            }
            tooltip={locked ? "Unlock canvas" : "Lock canvas"}
            ariaLabel={locked ? "Unlock canvas" : "Lock canvas"}
            isActive={locked}
            onClick={onToggleLock}
          />
        </TooltipProvider>
      </ToolbarContainer>
    </Panel>
  );
}

/**
 * Bottom-right viewport control toolbar: zoom out / current zoom % / zoom in,
 * with a fit-to-view shortcut. Replaces React Flow's default `<Controls>`.
 */
export function FlowViewportToolbar({
  fitViewPadding = 0.15,
  fitViewMinZoom,
  fitViewMaxZoom,
  position = "bottom-right",
}: {
  fitViewPadding?: number;
  fitViewMinZoom?: number;
  fitViewMaxZoom?: number;
  position?: "bottom-right" | "top-right";
} = {}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  const fitOptions = {
    padding: fitViewPadding,
    duration: 250,
    ...(fitViewMinZoom !== undefined ? { minZoom: fitViewMinZoom } : {}),
    ...(fitViewMaxZoom !== undefined ? { maxZoom: fitViewMaxZoom } : {}),
  };
  return (
    <Panel
      position={position}
      className={cn(
        "pointer-events-auto! z-20",
        position === "top-right"
          ? "mt-2! mr-2! md:mt-3! md:mr-3!"
          : "mb-2! mr-2! md:mb-3! md:mr-3!",
      )}
      data-testid="flow-viewport-toolbar"
    >
      <ToolbarContainer>
        <TooltipProvider delay={0}>
          <ToolbarIconButton
            icon={<MagnifyingGlassMinusIcon className="size-4" />}
            tooltip="Zoom Out"
            ariaLabel="Zoom Out"
            onClick={() => void zoomOut({ duration: 150 })}
          />
          <span className="min-w-12 px-1 text-center text-xs font-medium tabular-nums">
            {Math.round(zoom * 100)}%
          </span>
          <ToolbarIconButton
            icon={<MagnifyingGlassPlusIcon className="size-4" />}
            tooltip="Zoom In"
            ariaLabel="Zoom In"
            onClick={() => void zoomIn({ duration: 150 })}
          />
          <Separator orientation="vertical" className="mx-0.5 h-4!" />
          <ToolbarIconButton
            icon={<ArrowsOutIcon className="size-4" />}
            tooltip="Fit to View"
            ariaLabel="Fit to View"
            onClick={() => void fitView(fitOptions)}
          />
        </TooltipProvider>
      </ToolbarContainer>
    </Panel>
  );
}
