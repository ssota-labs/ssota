import { BrowseWorkspaceGridLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceGridLoading
      testId="route-loading-channels"
      sections={[
        { labelWidth: "w-36", count: 2, columns: "two" },
        { labelWidth: "w-40", count: 4, columns: "two" },
      ]}
    />
  );
}
