import { headers } from "next/headers";
import {
  NodePageContentLoading,
  PageContentLoading,
} from "@/components/console/browse-content-loading";
import { parsePageLoadingRoute } from "@/lib/console/parse-page-loading-route";
import { SegmentedListSkeleton } from "@/components/console/route-loaders";
import { ConsolePageFrame } from "@/components/console/console-page-frame";

function GenericPageRouteLoading() {
  return (
    <div data-testid="content-loading-page">
      <ConsolePageFrame contentClassName="gap-6">
        <SegmentedListSkeleton rows={4} row="card" />
      </ConsolePageFrame>
    </div>
  );
}

/** Route-level loading UI for json-render pages (`loading.tsx`). */
export async function PageRouteLoading() {
  const requestHeaders = await headers();
  const pathname = requestHeaders.get("x-pathname") ?? "";
  const parsed = parsePageLoadingRoute(pathname);

  if (!parsed) {
    return <GenericPageRouteLoading />;
  }

  if (parsed.kind === "node-page") {
    return (
      <NodePageContentLoading
        params={Promise.resolve({
          orgSlug: parsed.orgSlug,
          teamspaceSlug: parsed.teamspaceSlug,
          nodeId: parsed.nodeId,
          pageId: parsed.pageId,
        })}
      />
    );
  }

  return (
    <PageContentLoading
      params={Promise.resolve({
        orgSlug: parsed.orgSlug,
        teamspaceSlug: parsed.teamspaceSlug,
        pageId: parsed.pageId,
      })}
    />
  );
}
