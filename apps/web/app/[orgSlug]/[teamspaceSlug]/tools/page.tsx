import { redirect } from "next/navigation";
import { legacyOrgTeamspacePath } from "@/lib/console/paths";

export default async function ToolsRedirectPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  redirect(legacyOrgTeamspacePath({ orgSlug, teamspaceSlug }, "workers"));
}
