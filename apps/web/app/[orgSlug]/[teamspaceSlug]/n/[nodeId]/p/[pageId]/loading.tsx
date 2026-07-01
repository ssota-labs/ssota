import { BrowseWorkspaceListLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceListLoading
      testId="route-loading-node-page"
      sections={[{ labelWidth: "w-28", rows: 4 }]}
    />
  );
}
