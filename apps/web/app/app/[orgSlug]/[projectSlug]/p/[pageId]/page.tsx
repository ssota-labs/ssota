import { notFound } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { DynamicPageRenderer } from "@/lib/page-runtime";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveEndUserContext } from "@/lib/request-context";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";

export default async function AppDynamicPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; pageId: string }>;
}) {
  const { orgSlug, projectSlug, pageId } = await params;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const { graphRead } = getGraphPorts(ctx.projectId, ctx.accountId);

  const page = await getPagePort(ctx.projectId).getPage(pageId);
  if (!page) notFound();

  const context: Record<string, unknown> = {};
  if (page.subjectNodeId) {
    const subject = await graphRead.getNodeById(page.subjectNodeId);
    if (subject && subject.projectId === ctx.projectId) {
      context.subject = {
        id: subject.id,
        catalogKey: subject.catalogKey,
        title: subject.title,
        properties: subject.properties,
      };
      context.subjectNodeId = subject.id;
    }
  }

  const bindingData = await resolvePageBindings(
    graphRead,
    ctx.projectId,
    page.bindings,
    context,
  );
  await resolveArtifactBindings(ctx.projectId, page.bindings, bindingData);

  return (
    <div className="mx-auto max-w-5xl p-6">
      <DynamicPageRenderer
        spec={page.spec}
        bindingData={bindingData}
        basePath={appProjectPath({ orgSlug, projectSlug })}
      />
    </div>
  );
}
