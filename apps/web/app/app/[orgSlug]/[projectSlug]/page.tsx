import { redirect } from "next/navigation";
import { appProjectPath } from "@/lib/console/app-paths";
import { listAppPageLinks } from "@/lib/console/app-pages";
import { resolveEndUserContext } from "@/lib/request-context";

export default async function AppProjectHome({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const pageLinks = await listAppPageLinks(ctx.projectId);

  if (pageLinks[0]) {
    redirect(appProjectPath({ orgSlug, projectSlug }, "p", pageLinks[0].pageId));
  }

  redirect(appProjectPath({ orgSlug, projectSlug }, "c"));
}
