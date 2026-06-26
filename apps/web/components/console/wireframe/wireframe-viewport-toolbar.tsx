"use client";

import {
  DesktopIcon,
  DeviceMobileIcon,
  DeviceTabletIcon,
} from "@phosphor-icons/react";
import { ToggleGroup, ToggleGroupItem } from "@ssota/ui/components/ui/toggle-group";
import { cn } from "@ssota/ui/lib/utils";
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
  title: string;
  slug: string;
  viewport: WireframeViewport;
  onViewportChange: (viewport: WireframeViewport) => void;
  className?: string;
};

export function WireframeViewportToolbar({
  title,
  slug,
  viewport,
  onViewportChange,
  className,
}: WireframeViewportToolbarProps) {
  const { width, height } = WIREFRAME_VIEWPORT_SIZES[viewport];

  return (
    <div
      className={cn(
        "border-border bg-background/95 supports-backdrop-filter:bg-background/80 supports-backdrop-filter:backdrop-blur-md flex shrink-0 items-center gap-3 border-b px-3 py-2",
        className,
      )}
      data-testid="wireframe-viewport-toolbar"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="text-muted-foreground truncate text-[11px]">
          {slug}
          <span className="mx-1.5 opacity-40">·</span>
          {width}×{height}
        </p>
      </div>

      <ToggleGroup
        value={[viewport]}
        onValueChange={(values) => {
          const next = values[0] as WireframeViewport | undefined;
          if (next) onViewportChange(next);
        }}
        variant="outline"
        size="sm"
        spacing={0}
        className="bg-muted/40 shrink-0 rounded-lg p-0.5"
        aria-label="Preview viewport"
      >
        {WIREFRAME_VIEWPORT_ORDER.map((key) => {
          const { label, Icon } = VIEWPORT_META[key];
          return (
            <ToggleGroupItem
              key={key}
              value={key}
              aria-label={label}
              data-testid={`wireframe-viewport-${key}`}
              className="data-pressed:bg-background data-pressed:text-foreground data-pressed:shadow-sm gap-1.5 px-2.5"
            >
              <Icon className="size-4" data-icon="inline-start" />
              <span className="hidden sm:inline">{label}</span>
            </ToggleGroupItem>
          );
        })}
      </ToggleGroup>
    </div>
  );
}
