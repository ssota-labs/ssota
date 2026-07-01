import { Skeleton } from "@ssota/ui/components/ui/skeleton";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { GridCardSkeleton } from "@/components/console/route-loaders";

const PLANNED_CHANNELS = [
  "Slack",
  "Discord",
  "Telegram",
  "Web chat",
] as const;

/** Phase-2 Suspense fallback for Channels browse page. */
export function ChannelsContentLoading() {
  return (
    <div
      className="flex min-h-0 flex-1 flex-col"
      data-testid="content-loading-channels"
    >
      <ConsolePageFrame className="min-h-0 flex-1" contentClassName="gap-8">
        <header className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Channels</h1>
          <div className="max-w-2xl">
            <Skeleton className="h-4 w-full max-w-2xl rounded-sm" />
          </div>
        </header>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Linked workspaces
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            <GridCardSkeleton />
            <GridCardSkeleton />
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Supported channels
          </h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {PLANNED_CHANNELS.map((label) => (
              <div
                key={label}
                className="space-y-2 rounded-lg border bg-card p-4"
                aria-hidden
              >
                <Skeleton className="size-5 rounded-sm" />
                <span className="text-sm font-medium text-foreground">{label}</span>
                <Skeleton className="h-3 w-full rounded-sm" />
              </div>
            ))}
          </div>
        </section>
      </ConsolePageFrame>
    </div>
  );
}
