import { BrowseWorkspaceGridLoading } from "@/components/console/route-loaders";

export default function Loading() {
  return (
    <BrowseWorkspaceGridLoading
      testId="route-loading-templates"
      sections={[{ labelWidth: "w-36", count: 2, columns: "two" }]}
    />
  );
}
