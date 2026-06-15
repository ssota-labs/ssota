import { notFound } from "next/navigation";
import { initiativeExists } from "@/lib/console/initiatives";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function InitiativeLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
}) {
  const { orgSlug, projectSlug, initiativeId } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const exists = await initiativeExists(project.id, initiativeId);
  if (!exists) {
    notFound();
  }

  return children;
}
