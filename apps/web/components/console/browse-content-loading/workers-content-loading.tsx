import { ConnectionsBrowseLoading } from "@/components/console/browse-content-loading/connections-browse-loading";

export function WorkersContentLoading() {
  return (
    <ConnectionsBrowseLoading
      testId="workers-page-loading"
      titleSkeleton
      sections={[{ count: 6 }]}
    />
  );
}
