import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { cn } from "@ssota/ui/lib/utils";
import { WorkspaceHeader } from "@/lib/console/workspace-header";
import { ConsolePageFrame } from "@/components/console/console-page-frame";

/**
 * Card/list 표면 위 스켈레톤 채움 — 기본 `bg-muted`는 `bg-card` 위에서
 * 대비가 커서 헤더·페이지 톤보다 도드라진다. 헤더 스켈레톤과 맞추려면
 * muted를 낮춘다.
 */
const skeletonOnSurface = "bg-muted/40";

function BrowseHeaderSkeleton({ showAction = false }: { showAction?: boolean }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-3">
        <Skeleton className={cn("h-8 w-36 max-w-[45%] rounded-md", skeletonOnSurface)} />
        {showAction ? (
          <Skeleton className={cn("h-8 w-28 shrink-0 rounded-md", skeletonOnSurface)} />
        ) : null}
      </div>
      <Skeleton className={cn("h-4 w-full max-w-2xl rounded-md", skeletonOnSurface)} />
    </div>
  );
}

function SectionLabelSkeleton({ width = "w-28" }: { width?: string }) {
  return <Skeleton className={cn("h-3 rounded-sm", skeletonOnSurface, width)} />;
}

export function GridCardSkeleton() {
  return (
    <div className="space-y-2 rounded-lg border bg-card p-4">
      <Skeleton className={cn("size-5 rounded-sm", skeletonOnSurface)} />
      <Skeleton className={cn("h-4 w-[65%] rounded-sm", skeletonOnSurface)} />
      <Skeleton className={cn("h-3 w-full rounded-sm", skeletonOnSurface)} />
      <Skeleton className={cn("h-3 w-[80%] rounded-sm", skeletonOnSurface)} />
    </div>
  );
}

export function ListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className={cn("h-4 w-40 rounded-sm", skeletonOnSurface)} />
        <Skeleton className={cn("h-3 w-56 max-w-full rounded-sm", skeletonOnSurface)} />
        <Skeleton className={cn("h-3 w-full max-w-md rounded-sm", skeletonOnSurface)} />
      </div>
      <Skeleton className={cn("size-4 shrink-0 rounded-sm", skeletonOnSurface)} />
    </div>
  );
}

/** DocumentCardListSheet row: status badge + title/subtitle + caret. */
export function CardListRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="flex min-w-0 flex-1 items-start gap-2">
        <Skeleton
          className={cn("mt-0.5 h-5 w-14 shrink-0 rounded-full", skeletonOnSurface)}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton
            className={cn("h-4 w-48 max-w-full rounded-sm", skeletonOnSurface)}
          />
          <Skeleton
            className={cn("h-3 w-64 max-w-full rounded-sm", skeletonOnSurface)}
          />
        </div>
      </div>
      <Skeleton className={cn("size-4 shrink-0 rounded-sm", skeletonOnSurface)} />
    </div>
  );
}

type SegmentedListSkeletonProps = {
  rows?: number;
  row?: "default" | "card";
  className?: string;
};

export function SegmentedListSkeleton({
  rows = 4,
  row = "default",
  className,
}: SegmentedListSkeletonProps) {
  const Row = row === "card" ? CardListRowSkeleton : ListRowSkeleton;
  return (
    <div
      className={cn(
        "divide-y divide-border overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      {Array.from({ length: rows }, (_, index) => (
        <Row key={index} />
      ))}
    </div>
  );
}

export function SectionHeaderStatic({
  title,
  subtitle,
}: {
  title: string;
  subtitle?: string;
}) {
  return (
    <WorkspaceHeader
      as="h2"
      density="section"
      title={title}
      description={subtitle}
    />
  );
}

type BrowseGridLoadingProps = {
  showAction?: boolean;
  sections?: Array<{ labelWidth?: string; count?: number; columns?: "two" | "three" }>;
  testId?: string;
};

export function BrowseWorkspaceGridLoading({
  showAction = false,
  sections = [{ count: 6, columns: "three" }],
  testId,
}: BrowseGridLoadingProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid={testId}>
      <ConsolePageFrame className="min-h-0 flex-1" contentClassName="gap-8">
        <BrowseHeaderSkeleton showAction={showAction} />
        {sections.map((section, index) => {
          const gridClass =
            section.columns === "two"
              ? "sm:grid-cols-2"
              : "sm:grid-cols-2 lg:grid-cols-3";
          const count = section.count ?? 6;
          return (
            <section key={index} className="space-y-3">
              <SectionLabelSkeleton width={section.labelWidth} />
              <div className={cn("grid gap-2.5", gridClass)}>
                {Array.from({ length: count }, (_, cardIndex) => (
                  <GridCardSkeleton key={cardIndex} />
                ))}
              </div>
            </section>
          );
        })}
      </ConsolePageFrame>
    </div>
  );
}

type BrowseListLoadingProps = {
  showAction?: boolean;
  sections?: Array<{ labelWidth?: string; rows?: number }>;
  showSearch?: boolean;
  testId?: string;
};

export function BrowseWorkspaceListLoading({
  showAction = false,
  sections = [{ rows: 4 }],
  showSearch = false,
  testId,
}: BrowseListLoadingProps) {
  return (
    <div className="relative min-h-0 flex-1" data-testid={testId}>
      <div className="absolute inset-0 flex flex-col">
        <ConsolePageFrame contentClassName="gap-8">
        <BrowseHeaderSkeleton showAction={showAction} />
        {showSearch ? (
          <div className="flex gap-2">
            <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
            <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
          </div>
        ) : null}
        {sections.map((section, index) => {
          const rows = section.rows ?? 4;
          return (
            <section key={index} className="space-y-3">
              <SectionLabelSkeleton width={section.labelWidth} />
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {Array.from({ length: rows }, (_, rowIndex) => (
                  <ListRowSkeleton key={rowIndex} />
                ))}
              </div>
            </section>
          );
        })}
        </ConsolePageFrame>
      </div>
    </div>
  );
}

export function OverviewRouteLoading() {
  return (
    <div className="flex min-h-0 flex-1 flex-col" data-testid="route-loading-overview">
      <div className="min-h-0 flex-1 overflow-auto p-4 md:p-6">
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-3 rounded-xl border bg-card p-4">
                <Skeleton className="h-3 w-24 rounded-sm" />
                <Skeleton className="h-8 w-16 rounded-md" />
                <Skeleton className="h-3 w-full rounded-sm" />
              </div>
            ))}
          </div>

          <div className="space-y-4 rounded-xl border bg-card p-6">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-40 rounded-sm" />
              <Skeleton className="h-3 w-72 max-w-full rounded-sm" />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              {Array.from({ length: 3 }, (_, index) => (
                <div key={index} className="space-y-2 rounded-lg border bg-muted/20 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Skeleton className="h-4 w-20 rounded-sm" />
                    <Skeleton className="h-5 w-8 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-full rounded-sm" />
                </div>
              ))}
            </div>
            <Skeleton className="h-8 w-28 rounded-md" />
          </div>

          <section className="space-y-3">
            <Skeleton className="h-4 w-32 rounded-sm" />
            <div className="divide-y rounded-lg border bg-card">
              {Array.from({ length: 5 }, (_, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between gap-4 px-4 py-3"
                >
                  <Skeleton className="h-4 w-48 max-w-[55%] rounded-sm" />
                  <Skeleton className="h-3 w-32 shrink-0 rounded-sm" />
                </div>
              ))}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

export function TasksRouteLoading() {
  const columns = ["Pending", "Ready", "In progress", "Blocked"] as const;

  return (
    <div
      className="flex h-full min-h-0 flex-col bg-background"
      data-testid="route-loading-tasks"
    >
      <div className="flex shrink-0 items-start gap-2 border-b px-4 py-2">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Skeleton className="h-4 w-14 rounded-sm" />
          <Skeleton className="h-3 w-full max-w-lg rounded-sm" />
        </div>
        <Skeleton className="h-8 w-24 shrink-0 rounded-md" />
      </div>
      <div className="min-h-0 flex-1 overflow-auto p-4">
        <div className="flex min-h-[20rem] gap-3">
          {columns.map((column) => (
            <div
              key={column}
              className="flex w-64 shrink-0 flex-col gap-2 rounded-lg border bg-muted/15 p-2"
            >
              <div className="flex items-center justify-between px-1 py-1">
                <Skeleton className="h-3 w-16 rounded-sm" />
                <Skeleton className="h-5 w-6 rounded-full" />
              </div>
              {Array.from({ length: 2 }, (_, index) => (
                <div key={index} className="space-y-2 rounded-md border bg-card p-3">
                  <Skeleton className="h-4 w-full rounded-sm" />
                  <Skeleton className="h-3 w-[66%] rounded-sm" />
                  <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="size-6 rounded-full" />
                    <Skeleton className="h-3 w-20 rounded-sm" />
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function SettingsPanelRouteLoading({ testId }: { testId?: string }) {
  return (
    <div className="min-h-0 flex-1 overflow-y-auto bg-background" data-testid={testId}>
      <div className="mx-auto flex w-full max-w-4xl flex-col px-6 py-6">
        <header className="mb-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1 space-y-2">
            <Skeleton className="h-8 w-40 rounded-md" />
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
          </div>
          <Skeleton className="h-8 w-36 shrink-0 rounded-md" />
        </header>
        <div className="divide-y divide-border overflow-hidden rounded-lg border bg-card">
          {Array.from({ length: 3 }, (_, index) => (
            <ListRowSkeleton key={index} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** Padded fallback when a route has no dedicated loader. */
export function ProjectRouteLoading() {
  return (
    <BrowseWorkspaceGridLoading
      testId="route-loading-default"
      sections={[{ labelWidth: "w-32", count: 4, columns: "two" }]}
    />
  );
}

export function SandboxRouteLoading() {
  return (
    <BrowseWorkspaceListLoading
      testId="route-loading-sandbox"
      showAction
      sections={[{ labelWidth: "w-28", rows: 4 }]}
    />
  );
}

export function GraphRouteLoading() {
  return (
    <BrowseWorkspaceGridLoading
      testId="route-loading-graph"
      sections={[
        { labelWidth: "w-24", count: 6, columns: "three" },
        { labelWidth: "w-24", count: 4, columns: "three" },
      ]}
    />
  );
}
