import type { ReactNode } from "react";
import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { BrowseWorkspace } from "@/components/console/browse-workspace";
import { ConnectorCardSkeleton } from "@/components/connectors/connector-card-skeleton";

export type ConnectionsBrowseSection = {
  /** Omit for a flat grid under the page header (Channels / Tools style). */
  label?: string;
  count: number;
};

type ConnectionsBrowseLoadingProps = {
  testId: string;
  title?: string;
  titleSkeleton?: boolean;
  description?: ReactNode;
  sections: ConnectionsBrowseSection[];
};

/** Shared Connections grid shell — matches `ConnectorsView` + `BrowseWorkspace.Card` layout. */
export function ConnectionsBrowseLoading({
  testId,
  title,
  titleSkeleton = false,
  description,
  sections,
}: ConnectionsBrowseLoadingProps) {
  return (
    <div className="flex h-full min-h-0 flex-col" data-testid={testId}>
      <BrowseWorkspace.Frame>
        <header className="space-y-1">
          {titleSkeleton ? (
            <Skeleton className="h-8 w-40 max-w-[45%] rounded-md" />
          ) : (
            <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          )}
          {description ?? (
            <div className="max-w-2xl">
              <Skeleton className="h-4 w-72 max-w-full rounded-sm" />
            </div>
          )}
        </header>

        {sections.map((section, sectionIndex) => {
          const grid = (
            <BrowseWorkspace.Grid>
              {Array.from({ length: section.count }, (_, index) => (
                <ConnectorCardSkeleton key={index} showBadge={false} />
              ))}
            </BrowseWorkspace.Grid>
          );

          if (!section.label) {
            return <div key={sectionIndex}>{grid}</div>;
          }

          return (
            <BrowseWorkspace.Section key={section.label} label={section.label}>
              {grid}
            </BrowseWorkspace.Section>
          );
        })}
      </BrowseWorkspace.Frame>
    </div>
  );
}
