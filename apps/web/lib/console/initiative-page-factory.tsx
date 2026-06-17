import { ScopedDocumentRoute, ScopedListRoute } from "@/components/console/scoped-initiative-routes";
import { resolveProject } from "@/lib/console/resolve-project";

type InitiativePageProps = {
  params: Promise<{ orgSlug: string; projectSlug: string; initiativeId: string }>;
};

export async function createInitiativeListPage(
  props: InitiativePageProps,
  config: Parameters<typeof ScopedListRoute>[0] extends infer T ? Omit<T, "projectId" | "initiativeId" | "ctx"> : never,
) {
  const { orgSlug, projectSlug, initiativeId } = await props.params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  return (
    <ScopedListRoute
      projectId={project.id}
      initiativeId={initiativeId}
      ctx={ctx}
      {...config}
    />
  );
}

export async function createInitiativeDocumentPage(
  props: InitiativePageProps,
  config: Parameters<typeof ScopedDocumentRoute>[0] extends infer T
    ? Omit<T, "projectId" | "initiativeId" | "ctx">
    : never,
) {
  const { orgSlug, projectSlug, initiativeId } = await props.params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  return (
    <ScopedDocumentRoute
      projectId={project.id}
      initiativeId={initiativeId}
      ctx={ctx}
      {...config}
    />
  );
}
