import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { GridCardSkeleton } from "@/components/console/route-loaders";

/** Phase-2 Suspense fallback for Graph browse page. */
export function GraphContentLoading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="content-loading-graph"
    >
      <ConsolePageFrame className="min-h-0 flex-1" contentClassName="gap-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Graph</h1>
          <div className="max-w-2xl">
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Node types
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <GridCardSkeleton key={index} />
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Edge types
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 4 }, (_, index) => (
              <GridCardSkeleton key={index} />
            ))}
          </div>
        </section>
      </ConsolePageFrame>
    </div>
  );
}
