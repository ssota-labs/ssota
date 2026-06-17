"use client";

import { CursorClickIcon, EyeIcon } from "@phosphor-icons/react";
import type { StudioInteractionMode } from "@ssota/studio-renderer";
import { Button } from "@ssota/ui/components/ui/button";
import { cn } from "@/lib/utils";

type PreviewToolbarProps = {
  mode: StudioInteractionMode;
  onModeChange: (mode: StudioInteractionMode) => void;
  disabled?: boolean;
  onDeploy?: () => void;
  deployDisabled?: boolean;
  deployPending?: boolean;
};

export function PreviewToolbar({
  mode,
  onModeChange,
  disabled = false,
  onDeploy,
  deployDisabled = false,
  deployPending = false,
}: PreviewToolbarProps) {
  return (
    <div className="flex shrink-0 items-center gap-1 border-b bg-muted/30 px-2 py-1.5">
      <Button
        type="button"
        size="icon-sm"
        variant={mode === "inspect" ? "secondary" : "ghost"}
        disabled={disabled}
        aria-pressed={mode === "inspect"}
        aria-label="Inspect mode"
        data-testid="studio-mode-inspect"
        onClick={() => onModeChange("inspect")}
        title="Inspect — select layers in the preview"
      >
        <CursorClickIcon className="size-4" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={mode === "preview" ? "secondary" : "ghost"}
        disabled={disabled}
        aria-pressed={mode === "preview"}
        aria-label="Preview mode"
        data-testid="studio-mode-preview"
        onClick={() => onModeChange("preview")}
        title="Preview — interact with the component"
      >
        <EyeIcon className="size-4" />
      </Button>
      <span
        className={cn(
          "min-w-0 flex-1 truncate text-xs text-muted-foreground",
          disabled && "opacity-50",
        )}
      >
        {mode === "inspect"
          ? "Click elements in the preview to inspect"
          : "Live preview — selection disabled"}
      </span>
      {onDeploy ? (
        <Button
          type="button"
          size="sm"
          className="shrink-0"
          disabled={deployDisabled || deployPending}
          onClick={onDeploy}
        >
          {deployPending ? "Deploying…" : "Deploy"}
        </Button>
      ) : null}
    </div>
  );
}
