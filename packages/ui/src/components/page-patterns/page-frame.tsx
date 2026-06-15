import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageFrameProps = {
  filters?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
};

export function PageFrame({
  filters,
  actions,
  children,
  className,
  bodyClassName,
}: PageFrameProps) {
  const hasToolbar = filters != null || actions != null;

  return (
    <div className={cn("flex min-h-0 flex-1 flex-col", className)}>
      {hasToolbar ? (
        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b px-4 py-3 md:px-6">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
            {filters}
          </div>
          {actions ? (
            <div className="flex shrink-0 items-center gap-2">{actions}</div>
          ) : null}
        </div>
      ) : null}
      <div className={cn("min-h-0 flex-1 overflow-auto p-4 md:p-6", bodyClassName)}>
        {children}
      </div>
    </div>
  );
}
