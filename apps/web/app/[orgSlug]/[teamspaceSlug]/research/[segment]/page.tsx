import { notFound, redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";
import { resolveOrg } from "@/lib/console/resolve-project";
import { getPagePort } from "@/lib/ports";

const SEGMENT_TO_PAGE_SLUG: Record<string, string> = {
  market: "research/market",
  user: "research/user",
  hypotheses: "research/hypotheses",
};

/** Legacy slug URLs → dynamic page id (`pages.slug = research/...`). */
export default async function ResearchPageRedirect({
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
