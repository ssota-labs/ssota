import {
  readPageDefinitionByRouteKey,
  resolvePageBindings,
} from "@ssota/core";
import { notFound } from "next/navigation";
import { DynamicPageRenderer } from "@/lib/lab-sandbox/dynamic-page-renderer";
import { resolveEndUserContext } from "@/lib/request-context";
import { getGraphPorts } from "@/lib/ports";

export default async function AppDynamicPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; routeKey: string }>;
}) {
  const { orgSlug, projectSlug, routeKey } = await params;
  const ctx = await resolveEndUserContext(orgSlug, projectSlug);
  const { graphRead } = getGraphPorts(ctx.projectId, ctx.accountId);

  const page = await readPageDefinitionByRouteKey(
    graphRead,
    ctx.projectId,
    routeKey,
  );
  if (!page) notFound();

  const bindingData = await resolvePageBindings(
    graphRead,
    ctx.projectId,
    page.definition.bindings,
    page.definition.context ?? {},
  );

  return (
    <div className="mx-auto max-w-5xl">
      <DynamicPageRenderer spec={page.definition.spec} bindingData={bindingData} />
    </div>
  );
}
