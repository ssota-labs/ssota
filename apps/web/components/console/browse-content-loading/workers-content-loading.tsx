import { ConnectionsBrowseLoading } from "@/components/console/browse-content-loading/connections-browse-loading";

export function WorkersContentLoading() {
  return (
    <ConnectionsBrowseLoading
      testId="workers-page-loading"
      titleSkeleton
      sections={[{ count: 3 }, { count: 2 }, { count: 2 }]}
    />
  );
}
