import { ConnectionsBrowseLoading } from "@/components/console/browse-content-loading/connections-browse-loading";
import { getComposioThemeSections } from "@/components/console/browse-content-loading/shared";

/** Phase-1 sync route fallback for Connections grid pages. */
export function ConnectionsRouteLoading() {
  return (
    <ConnectionsBrowseLoading
      testId="route-loading-connections"
      titleSkeleton
      sections={getComposioThemeSections()}
    />
  );
}
