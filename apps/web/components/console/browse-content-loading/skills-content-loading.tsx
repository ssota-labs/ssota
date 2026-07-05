import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { ListRowSkeleton } from "@/components/console/route-loaders";

const DEFAULT_SKILL_ROWS = 6;

/** Phase-2 Suspense fallback for Skills browse page. */
export function SkillsContentLoading() {
  return (
    <div
      className="relative min-h-0 flex-1"
      data-testid="content-loading-skills"
    >
      <div className="absolute inset-0 flex flex-col overflow-hidden">
        <div className="h-full overflow-y-auto">
          <ConsolePageFrame contentClassName="gap-8">
            <header className="space-y-1">
              <div className="flex items-start justify-between gap-3">
                <h1 className="text-2xl font-semibold tracking-tight">Skills</h1>
                <Skeleton className="h-9 w-28 shrink-0 rounded-md" />
              </div>
              <div className="max-w-2xl">
                <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
              </div>
            </header>

            <div className="mt-2 flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-28 rounded-md" />
            </div>

            <div className="mt-4 flex gap-2">
              <Skeleton className="h-9 min-w-0 flex-1 rounded-md" />
              <Skeleton className="h-9 w-20 shrink-0 rounded-md" />
            </div>

            <section className="mt-4 space-y-3">
              <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                My library
              </h2>
              <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {Array.from({ length: DEFAULT_SKILL_ROWS }, (_, index) => (
                  <ListRowSkeleton key={index} />
                ))}
              </div>
            </section>
          </ConsolePageFrame>
        </div>
      </div>
    </div>
  );
}
