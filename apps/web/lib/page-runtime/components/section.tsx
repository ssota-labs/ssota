"use client";

import { cn } from "@ssota/ui/lib/utils";
import {
  SectionHeaderActionsContext,
  useSectionHeaderEndState,
} from "./section-header-actions";

function paddingClass(
  value: unknown,
  defaultPadding = true,
): string | undefined {
  if (value === "none") return undefined;
  if (value === "default") return "p-4 md:p-6";
  return defaultPadding ? "p-4 md:p-6" : undefined;
}

export function SectionEl({
  title,
  subtitle,
  padding,
  children,
}: {
  title?: string;
  subtitle?: string;
  padding?: unknown;
  children: React.ReactNode;
}) {
  const [headerEnd, setHeaderEnd] = useSectionHeaderEndState();
  const hasTitle = Boolean(title);
  const hasSubtitle = Boolean(subtitle);
  const showHeader = hasTitle || hasSubtitle || headerEnd;

  return (
    <SectionHeaderActionsContext value={{ setHeaderEnd }}>
      <section
        className={cn(
          "flex min-h-0 flex-1 flex-col gap-4",
          paddingClass(padding),
        )}
      >
        {showHeader ? (
          <header className="flex shrink-0 items-center justify-between gap-4">
            <div className="min-w-0 flex-1 space-y-1">
              {hasTitle ? (
                <h2 className="text-lg font-semibold">{title}</h2>
              ) : null}
              {hasSubtitle ? (
                <p className="text-muted-foreground text-sm">{subtitle}</p>
              ) : null}
            </div>
            {headerEnd ? (
              <div className="flex shrink-0 flex-wrap items-center justify-end gap-3">
                {headerEnd}
              </div>
            ) : null}
          </header>
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          {children}
        </div>
      </section>
    </SectionHeaderActionsContext>
  );
}
