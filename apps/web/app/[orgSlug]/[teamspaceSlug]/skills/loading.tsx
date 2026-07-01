import { BrowseWorkspaceListLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceListLoading
      testId="route-loading-skills"
      showAction
      showSearch
      sections={[{ labelWidth: "w-20", rows: 6 }]}
    />
  );
}
