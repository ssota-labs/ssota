import { cn } from "@ssota/ui/lib/utils";

/** Shared card chrome for connector grid cards and their loading skeletons. */
export const connectorCardClassName = cn(
  "flex items-center gap-3 rounded-xl border bg-card px-3.5 py-3 text-left",
);

export const connectorCardInteractiveClassName = cn(
  connectorCardClassName,
  "group transition-colors hover:border-primary/30 hover:bg-accent/40",
);

export const connectorIconWrapClassName =
  "flex size-9 shrink-0 items-center justify-center rounded-lg border bg-muted/40";

export const connectorCardTextClassName = "min-w-0 flex-1";

export const connectorCardTitleClassName = "block truncate text-sm font-medium";

export const connectorCardDescriptionClassName =
  "block truncate text-xs text-muted-foreground";
