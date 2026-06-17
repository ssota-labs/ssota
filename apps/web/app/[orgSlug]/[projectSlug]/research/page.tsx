import { redirect } from "next/navigation";
import { projectPath } from "@/lib/console/paths";

export default async function ResearchIndexPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  redirect(projectPath({ orgSlug, projectSlug }, "research", "market"));
}
