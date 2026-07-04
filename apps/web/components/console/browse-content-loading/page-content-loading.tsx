import { PageChrome } from "@/components/console/page-chrome";
import { PageSpecContentSkeleton } from "@/components/console/browse-content-loading/page-spec-skeleton";
import { orgPath, type OrgRouteContext } from "@/lib/console/paths";
import { loadPageSiblingNav } from "@/lib/console/page-sibling-nav";
import { resolveOrgPage } from "@/lib/console/resolve-org-page";
import { getPagePort } from "@/lib/ports";

type PageContentLoadingParams = {
  orgSlug: string;
  teamspaceSlug: string;
  pageId: string;
};

async function loadPageChromeContext(
  orgSlug: string,
  pageId: string,
  buildHref: (id: string) => string,
) {
  const { teamspace: project, page } = await resolveOrgPage(orgSlug, pageId);
  const pagePort = getPagePort(project.id);
  const siblingNav = await loadPageSiblingNav(pagePort, page, buildHref);
  return { project, page, siblingNav };
}

/** Phase-2 Suspense fallback for json-render tree pages. */
export async function PageContentLoading({
  params,
}: {
  params: Promise<PageContentLoadingParams>;
}) {
  const { orgSlug, teamspaceSlug, pageId } = await params;
  const routeCtx: OrgRouteContext = { orgSlug, teamspaceSlug };
  const { page, siblingNav } = await loadPageChromeContext(orgSlug, pageId, (id) =>
    orgPath(routeCtx, "p", id),
  );

  return (
    <PageChrome
      spec={page.spec}
      siblingNav={siblingNav}
      testId="content-loading-page"
    >
      <PageSpecContentSkeleton spec={page.spec} />
    </PageChrome>
  );
}

/** Phase-2 Suspense fallback for node drill-in template pages. */
export async function NodePageContentLoading({
  params,
}: {
  params: Promise<PageContentLoadingParams & { nodeId: string }>;
}) {
  const { orgSlug, teamspaceSlug, pageId, nodeId } = await params;
  const routeCtx: OrgRouteContext = { orgSlug, teamspaceSlug };
  const { page, siblingNav } = await loadPageChromeContext(orgSlug, pageId, (id) =>
    orgPath(routeCtx, "n", nodeId, "p", id),
  );

  return (
    <PageChrome
      spec={page.spec}
      siblingNav={siblingNav}
      testId="content-loading-node-page"
    >
      <PageSpecContentSkeleton spec={page.spec} />
    </PageChrome>
  );
}
