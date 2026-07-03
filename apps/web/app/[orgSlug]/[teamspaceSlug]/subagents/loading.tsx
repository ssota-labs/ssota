import { BrowseWorkspaceListLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceListLoading
      testId="route-loading-subagents"
      sections={[{ labelWidth: "w-24", rows: 2 }]}
    />
  );
}
