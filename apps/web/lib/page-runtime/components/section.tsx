"use client";

import { cn } from "@ssota/ui/lib/utils";
import { WorkspaceHeader } from "@/lib/console/workspace-header";
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
          "flex min-h-0 flex-1 flex-col gap-3",
          paddingClass(padding),
        )}
      >
        {showHeader && hasTitle ? (
          <WorkspaceHeader
            as="h2"
            density="section"
            title={title!}
            description={hasSubtitle ? subtitle : undefined}
            actions={headerEnd}
          />
        ) : null}
        <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-auto">
          {children}
        </div>
      </section>
    </SectionHeaderActionsContext>
  );
}
