"use client";

import type { ComponentProps, HTMLAttributes, ReactNode } from "react";
import { Button } from "@ssota/ui/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@ssota/ui/components/ui/tooltip";
import { cn } from "@ssota/ui/lib/utils";

export type ArtifactProps = HTMLAttributes<HTMLDivElement>;

export function Artifact({ className, ...props }: ArtifactProps) {
  return (
    <div
      className={cn(
        "flex flex-col overflow-hidden rounded-lg border bg-background shadow-sm",
        className,
      )}
      {...props}
    />
  );
}

export type ArtifactHeaderProps = HTMLAttributes<HTMLDivElement>;

export function ArtifactHeader({ className, ...props }: ArtifactHeaderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-2 border-b bg-muted/50 px-4 py-2.5",
        className,
      )}
      {...props}
    />
  );
}

export type ArtifactTitleProps = HTMLAttributes<HTMLParagraphElement>;

export function ArtifactTitle({ className, ...props }: ArtifactTitleProps) {
  return (
    <p
      className={cn("text-sm font-medium text-foreground", className)}
      {...props}
    />
  );
}

export type ArtifactDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function ArtifactDescription({
  className,
  ...props
}: ArtifactDescriptionProps) {
  return (
    <p className={cn("text-xs text-muted-foreground", className)} {...props} />
  );
}

export type ArtifactActionsProps = HTMLAttributes<HTMLDivElement>;

export function ArtifactActions({ className, ...props }: ArtifactActionsProps) {
  return <div className={cn("flex shrink-0 items-center gap-0.5", className)} {...props} />;
}

export type ArtifactActionProps = ComponentProps<typeof Button> & {
  tooltip?: string;
  label?: string;
  icon?: ReactNode;
};

export function ArtifactAction({
  tooltip,
  label,
  icon,
  children,
  className,
  size = "icon-sm",
  variant = "ghost",
  ...props
}: ArtifactActionProps) {
  const content = icon ?? children;
  const aria = label ?? tooltip;

  const button = (
    <Button
      type="button"
      size={size}
      variant={variant}
      className={cn(
        "size-8 rounded-sm text-muted-foreground hover:text-foreground",
        className,
      )}
      aria-label={aria}
      {...props}
    >
      {content}
    </Button>
  );

  if (!tooltip) {
    return button;
  }

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom" sideOffset={4}>
        {tooltip}
      </TooltipContent>
    </Tooltip>
  );
}

export type ArtifactContentProps = HTMLAttributes<HTMLDivElement>;

export function ArtifactContent({ className, ...props }: ArtifactContentProps) {
  return <div className={cn("min-h-0 flex-1 overflow-auto", className)} {...props} />;
}
