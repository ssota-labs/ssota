import { notFound, redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getPagePort } from "@/lib/ports";

const SEGMENT_TO_PAGE_SLUG: Record<string, string> = {
  backlog: "development/backlog",
  sprints: "development/sprints",
  "pull-requests": "development/pull-requests",
  "api-snapshots": "development/api-snapshots",
  "data-model": "development/data-model",
  "system-model": "development/system-model",
  "api-reference": "development/api-reference",
  integration: "development/integration",
};

/** Legacy slug URLs → dynamic page id (`pages.slug = development/...`). */
export default async function DevelopmentPageRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string; segment: string }>;
}) {
  const { orgSlug, teamspaceSlug, segment } = await params;
  const pageSlug = SEGMENT_TO_PAGE_SLUG[segment];
  if (!pageSlug) {
    notFound();
  }

  const { project } = await resolveOrg(orgSlug, teamspaceSlug);
  const page = await getPagePort(project.id).getPageBySlug(pageSlug);
  if (!page) {
    notFound();
  }

  redirect(orgPath({ orgSlug, teamspaceSlug }, "p", page.id));
}
