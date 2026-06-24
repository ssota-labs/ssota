import { notFound, redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
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
  params: Promise<{ orgSlug: string; projectSlug: string; segment: string }>;
}) {
  const { orgSlug, projectSlug, segment } = await params;
  const pageSlug = SEGMENT_TO_PAGE_SLUG[segment];
  if (!pageSlug) {
    notFound();
  }

  const { project } = await resolveProject(orgSlug, projectSlug);
  const page = await getPagePort(project.id).getPageBySlug(pageSlug);
  if (!page) {
    notFound();
  }

  redirect(projectPath({ orgSlug, projectSlug }, "p", page.id));
}
