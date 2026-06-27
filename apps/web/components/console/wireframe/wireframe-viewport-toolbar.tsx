"use client";

import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
} from "@phosphor-icons/react";
import { Panel } from "@xyflow/react";
import {
  ToolbarContainer,
  ToolbarIconButton,
} from "@/lib/page-runtime/components/flow-toolbar";
import { TooltipProvider } from "@ssota/ui/components/ui/tooltip";
import {
  WIREFRAME_VIEWPORT_ORDER,
  WIREFRAME_VIEWPORT_SIZES,
  type WireframeViewport,
} from "@/lib/wireframe/viewport";

const VIEWPORT_META: Record<
  WireframeViewport,
  { label: string; Icon: typeof DeviceMobileIcon }
> = {
  mobile: { label: "Mobile", Icon: DeviceMobileIcon },
  tablet: { label: "Tablet", Icon: DeviceTabletIcon },
  desktop: { label: "Desktop", Icon: DesktopIcon },
};

type WireframeViewportToolbarProps = {
  viewport: WireframeViewport;
  onViewportChange: (viewport: WireframeViewport) => void;
};

/**
 * Floating top-center device-viewport switcher for the wireframe canvas, styled
 * after the flow canvas toolbars (`ToolbarContainer` + `ToolbarIconButton`):
 * mobile / tablet / desktop icon buttons with a current-size readout. Rendered
 * as a React Flow `Panel`, so it must live inside a `<ReactFlow>`.
 */
export function WireframeViewportToolbar({
  viewport,
  onViewportChange,
}: WireframeViewportToolbarProps) {
  const { width, height } = WIREFRAME_VIEWPORT_SIZES[viewport];

  return (
    <Panel
      position="top-center"
      className="pointer-events-auto! mt-3! z-10"
      data-testid="wireframe-viewport-toolbar"
    >
      <ToolbarContainer>
        <TooltipProvider delay={0}>
          {WIREFRAME_VIEWPORT_ORDER.map((key) => {
            const { label, Icon } = VIEWPORT_META[key];
            return (
              <ToolbarIconButton
                key={key}
                icon={<Icon className="size-4" data-testid={`wireframe-viewport-${key}`} />}
                tooltip={label}
                ariaLabel={label}
                isActive={key === viewport}
                onClick={() => onViewportChange(key)}
              />
            );
          })}
          <span className="min-w-16 px-1 text-center text-xs font-medium tabular-nums">
            {width}×{height}
          </span>
        </TooltipProvider>
      </ToolbarContainer>
    </Panel>
  );
}
