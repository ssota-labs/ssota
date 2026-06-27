import type { ReactNode } from "react";
import { cn } from "@ssota/ui/lib/utils";

/** Scroll region for Connectors page + loading skeleton (matches TasksExplorer height chain). */
export function ConnectorsScrollShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("min-h-0 flex-1 overflow-y-auto", className)}>{children}</div>
  );
}
