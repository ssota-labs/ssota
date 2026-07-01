import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { ListRowSkeleton } from "@/components/console/route-loaders";

/** Phase-2 Suspense fallback for Schedules browse page. */
export function SchedulesContentLoading() {
  return (
    <div
      className="relative min-h-0 flex-1"
      data-testid="content-loading-schedules"
    >
      <ConsolePageFrame contentClassName="gap-8">
        <header className="space-y-1">
          <div className="flex items-start justify-between gap-3">
            <h1 className="text-2xl font-semibold tracking-tight">Schedules</h1>
            <Skeleton className="h-9 w-32 shrink-0 rounded-md" />
          </div>
          <div className="max-w-2xl">
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Active schedules
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
            {Array.from({ length: 4 }, (_, index) => (
              <ListRowSkeleton key={index} />
            ))}
          </div>
        </section>
      </ConsolePageFrame>
    </div>
  );
}
