import { Skeleton } from "@ssota/ui/components/ui/skeleton";

export function ChatThreadLoading() {
  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
          <div className="space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-20 w-full rounded-lg" />
          </div>
          <div className="ml-auto max-w-[80%] space-y-2">
            <Skeleton className="ml-auto h-4 w-16" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-24 w-full rounded-lg" />
          </div>
        </div>
      </div>
      <div className="p-4">
        <div className="mx-auto w-full max-w-3xl">
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      </div>
    </div>
  );
}
