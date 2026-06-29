import { notFound } from "next/navigation";
import { resolvePageBindings } from "@ssota/core";
import { ConsolePageFrame } from "@/components/console/console-page-frame";
import { DynamicPageRenderer } from "@/lib/page-runtime";
import { pageUsesArtifactWorkbench } from "@/lib/page-runtime/spec-utils";
import { appProjectPath } from "@/lib/console/app-paths";
import { resolveEndUserContext } from "@/lib/request-context";
import { getGraphPorts, getPagePort } from "@/lib/ports";
import { resolveArtifactBindings } from "@/lib/design-studio/resolve-artifact-binding";

export default async function AppDynamicPage({
  params,
}: {
  params: Promise<{ orgSlug: string; teamspaceSlug: string; pageId: string }>;
}) {
  const { orgSlug, teamspaceSlug, pageId } = await params;
  const ctx = await resolveEndUserContext(orgSlug, teamspaceSlug);
  const { graphRead } = await getGraphPorts(ctx.teamspaceId, ctx.accountId);

  const page = await getPagePort(ctx.teamspaceId).getPage(pageId);
  if (!page) notFound();

  const context: Record<string, unknown> = {};
  if (page.subjectNodeId) {
    const subject = await graphRead.getNodeById(page.subjectNodeId);
    if (subject && subject.teamspaceId === ctx.teamspaceId) {
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
    ctx.teamspaceId,
    page.bindings,
    context,
  );
  await resolveArtifactBindings(ctx.teamspaceId, page.bindings, bindingData);

  const usesWorkbench = pageUsesArtifactWorkbench(page.spec);

  return (
    <ConsolePageFrame fullWidth={usesWorkbench} fillHeight={!usesWorkbench}>
      <DynamicPageRenderer
        spec={page.spec}
        bindingData={bindingData}
        basePath={appProjectPath({ orgSlug, teamspaceSlug })}
      />
    </ConsolePageFrame>
  );
}
