import { redirect } from "next/navigation";
import { CatalogLabEditor } from "@/components/lab/catalog-lab-editor";
import { isCatalogLabEnabled } from "@/lib/lab/catalog-lab-enabled";
import { resolveProject } from "@/lib/console/resolve-project";

export default async function CatalogLabPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  if (!isCatalogLabEnabled()) redirect("/");

  const { orgSlug, projectSlug } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  return (
    <CatalogLabEditor
      projectId={project.id}
      orgSlug={orgSlug}
      projectSlug={projectSlug}
      mode="catalog"
    />
  );
}
