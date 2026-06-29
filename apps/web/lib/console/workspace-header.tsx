import type { ElementType, ReactNode } from "react";
import { cn } from "@ssota/ui/lib/utils";

export type WorkspaceHeaderDensity = "page" | "section";

export function WorkspaceHeader({
  title,
  description,
  actions,
  density = "page",
  as: Heading = "h2",
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  density?: WorkspaceHeaderDensity;
  as?: ElementType;
  className?: string;
}) {
  const titleClass =
    density === "page"
      ? "text-2xl font-semibold tracking-tight"
      : "text-sm font-semibold";
  const descriptionClass =
    density === "page"
      ? "max-w-2xl text-sm text-muted-foreground"
      : "max-w-2xl text-xs text-muted-foreground";

  return (
    <header className={cn("space-y-1", className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <Heading className={titleClass}>{title}</Heading>
          {description ? (
            <p className={descriptionClass}>{description}</p>
          ) : null}
        </div>
        {actions ? <div className="shrink-0 pt-1">{actions}</div> : null}
      </div>
    </header>
  );
}
