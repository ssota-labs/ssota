import { redirect } from "next/navigation";
import { appProjectPath } from "@/lib/console/app-paths";
import { listAppPageLinks } from "@/lib/console/app-pages";
import { resolveEndUserContext } from "@/lib/request-context";

export default async function AppProjectHome({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  const ctx = await resolveEndUserContext(orgSlug, teamspaceSlug);
  const pageLinks = await listAppPageLinks(ctx.teamspaceId);

  if (pageLinks[0]) {
    redirect(appProjectPath({ orgSlug, teamspaceSlug }, "p", pageLinks[0].pageId));
  }

  redirect(appProjectPath({ orgSlug, teamspaceSlug }, "c"));
}
