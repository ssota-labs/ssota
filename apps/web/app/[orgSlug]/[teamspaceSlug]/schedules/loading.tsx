import { BrowseWorkspaceListLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceListLoading
      testId="route-loading-schedules"
      showAction
      sections={[{ rows: 4 }]}
    />
  );
}
