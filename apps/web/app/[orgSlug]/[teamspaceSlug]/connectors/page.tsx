import { redirect } from "next/navigation";
import { orgPath } from "@/lib/console/paths";

export default async function LegacyConnectorsRedirect({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string }>;
}) {
  const { orgSlug, teamspaceSlug } = await params;
  redirect(orgPath({ orgSlug, teamspaceSlug }, "connections"));
}
