import { BrowseWorkspaceListLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceListLoading
      testId="route-loading-agents"
      sections={[
        { labelWidth: "w-20", rows: 2 },
        { labelWidth: "w-24", rows: 3 },
      ]}
    />
  );
}
