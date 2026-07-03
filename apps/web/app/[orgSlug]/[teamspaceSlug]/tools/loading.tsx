import { BrowseWorkspaceGridLoading } from "@/components/console/route-loaders";
import { BUILTIN_TEMPLATES } from "@ssota/adapter-postgres";

export default function Loading() {
  return (
    <BrowseWorkspaceGridLoading
      testId="route-loading-tools"
      sections={[{ labelWidth: "w-36", count: BUILTIN_TEMPLATES.length, columns: "two" }]}
    />
  );
}
