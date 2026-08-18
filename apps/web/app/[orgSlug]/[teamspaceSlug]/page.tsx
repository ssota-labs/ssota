import { DEFAULT_LANDING_SEGMENT } from "@/lib/company-workspace/navigation";
import { redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";

export default async function ProjectIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  redirect(orgPath({ orgSlug, teamspaceSlug }, DEFAULT_LANDING_SEGMENT));
}
