import { BrowseWorkspaceGridLoading } from "@/components/console/route-loaders";
import { getComposioThemeGridSections } from "@/components/console/browse-content-loading/shared";

/** Phase-1 sync route fallback for Connections grid pages. */
export function ConnectionsRouteLoading() {
  return (
    <BrowseWorkspaceGridLoading
      testId="route-loading-connections"
      sections={getComposioThemeGridSections()}
    />
  );
}
