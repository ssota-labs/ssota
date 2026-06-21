import { notFound } from "next/navigation";
import {
  readPageDefinitionByRouteKey,
  resolvePageBindings,
} from "@ssota/core";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts } from "@/lib/ports";
import { DynamicPageClient } from "./page-client";

/**
 * Production renderer for an agent-authored page. Loads the `page` node whose
 * definition matches `routeKey`, resolves its bindings against the live graph
 * (server-side), and renders the JSON-render spec. This is the agent's owned
 * dashboard surface (page-unit, not chat-unit).
 */
export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string; routeKey: string }>;
}) {
  const { orgSlug, projectSlug, routeKey } = await params;
  const { project } = await resolveProject(orgSlug, projectSlug);

  const graphRead = getGraphPorts(project.id).graphRead;
  const page = await readPageDefinitionByRouteKey(
    graphRead,
    project.id,
    routeKey,
  );
  if (!page) {
    notFound();
  }

  // account_id scoping (Phase 5) will be injected here once the read port is
  // account-aware; today it resolves the shared/builder graph.
  const bindingData = await resolvePageBindings(
    graphRead,
    project.id,
    page.definition.bindings,
    page.definition.context ?? {},
  );

  return (
    <div className="mx-auto max-w-5xl p-6">
      <DynamicPageClient
        spec={page.definition.spec}
        bindingData={bindingData}
        orgSlug={orgSlug}
        projectSlug={projectSlug}
        routeKey={routeKey}
      />
    </div>
  );
}
