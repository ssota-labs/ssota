"use server";

import { pageActionSchema } from "@ssota/contracts";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { resolveProject } from "@/lib/console/resolve-project";
import { projectPath } from "@/lib/console/paths";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getPagePort } from "@/lib/ports";
import { resolveBuilderContext } from "@/lib/request-context";
import { resolveActionParams } from "./resolve-action-params";

export async function executePageAction(input: {
  orgSlug: string;
  projectSlug: string;
  pageId: string;
  actionKey: string;
  payload: Record<string, unknown>;
}) {
  await resolveBuilderContext(input.orgSlug, input.projectSlug);
  const { project } = await resolveProject(input.orgSlug, input.projectSlug);
  const page = await getPagePort(project.id).getPage(input.pageId);
  if (!page) {
    throw new Error("Page not found");
  }

  const actionDef = page.actions[input.actionKey];
  if (!actionDef) {
    throw new Error(`Unknown page action: ${input.actionKey}`);
  }

  const action = pageActionSchema.parse(actionDef);

  if (action.kind === "update_node") {
    const nodeId = String(resolveActionParams(action.nodeId, input.payload));
    const title =
      action.title !== undefined
        ? resolveActionParams(action.title, input.payload)
        : undefined;

    let properties: Record<string, unknown> | undefined;
    if (action.properties) {
      const resolved = resolveActionParams(action.properties, input.payload) as Record<
        string,
        unknown
      >;
      if (action.merge) {
        const deps = getGraphDeps(project.id);
        const existing = await deps.graphRead.getNode({
          projectId: project.id,
          nodeId,
        });
        properties = { ...(existing?.properties ?? {}), ...resolved };
      } else {
        properties = resolved;
      }
    }

    await updateGraphNodeAction({
      projectId: project.id,
      nodeId,
      title: typeof title === "string" ? title : undefined,
      properties,
      revalidatePaths: [
        projectPath(
          { orgSlug: input.orgSlug, projectSlug: input.projectSlug },
          "p",
          input.pageId,
        ),
      ],
    });
    return;
  }

  throw new Error(`Unsupported page action kind: ${action.kind}`);
}
