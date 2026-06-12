import { Skeleton } from "@ssota/ui/components/ui/skeleton";

export function ProjectRouteLoading() {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-4 w-96 max-w-full" />
      </div>
      <div className="grid gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton key={index} className="h-32 rounded-lg" />
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-lg" />
        <Skeleton className="h-48 rounded-lg" />
      </div>
    </div>
  );
}

export function GraphRouteLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-24" />
      </div>
      <div className="flex min-h-0 flex-1 gap-4 px-4 pb-4">
        <Skeleton className="hidden h-full w-56 shrink-0 rounded-lg md:block" />
        <Skeleton className="h-full min-h-[20rem] flex-1 rounded-lg" />
      </div>
    </div>
  );
}
