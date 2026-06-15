import { redirect } from "next/navigation";
import { getDomainDefaultHref } from "@/lib/console/navigation";
import { projectPath } from "@/lib/console/paths";

export default async function ExecutiveIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  redirect(projectPath({ orgSlug, projectSlug }, ...getDomainDefaultHref("executive").split("/")));
}
