"use server";

import { revalidatePath } from "next/cache";
import {
  createEdge,
  createNode,
  deleteEdge,
  readPageDefinitionByRouteKey,
  resolvePageBindings,
  updateNode,
} from "@ssota/core";
import type { PageAction } from "@ssota/contracts";
import { resolveProject } from "@/lib/console/resolve-project";
import { getGraphPorts } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

/** Resolve a dotted path (e.g. "rows.0.id") into a nested value. */
function getPath(source: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    if (Array.isArray(acc)) return acc[Number(key)];
    if (typeof acc === "object") return (acc as Record<string, unknown>)[key];
    return undefined;
  }, source);
}

/** Interpolate an action-descriptor param: value-ref objects → resolved value. */
function makeInterpolator(
  bindingData: Record<string, unknown>,
  context: Record<string, unknown>,
  input: Record<string, unknown>,
) {
  return function interp(value: unknown): unknown {
    if (value && typeof value === "object" && !Array.isArray(value)) {
      const ref = value as Record<string, unknown>;
      if (typeof ref.$binding === "string") return getPath(bindingData, ref.$binding);
      if (typeof ref.$ctx === "string") return getPath(context, ref.$ctx);
      if (typeof ref.$input === "string") return getPath(input, ref.$input);
    }
    return value;
  };
}

function interpRecord(
  record: Record<string, unknown> | undefined,
  interp: (v: unknown) => unknown,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(record ?? {})) {
    out[key] = interp(value);
  }
  return out;
}

/**
 * Execute a page element's declared action. The descriptor is re-read
 * server-side from the page definition (the client only sends the action KEY and
 * collected form input — never the descriptor), then interpolated and dispatched
 * to the matching graph use-case.
 *
 * CHOKEPOINT: this switch is the single place page actions mutate the graph.
 * A later iteration can replace these direct use-case calls with
 * executeAction(gate → commit → action_logs) without touching the schema,
 * interpolation, renderer, or route wiring.
 */
export async function runPageActionAction(
  orgSlug: string,
  projectSlug: string,
  routeKey: string,
  actionKey: string,
  payload: Record<string, unknown>,
) {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getGraphPorts(project.id);

  const page = await readPageDefinitionByRouteKey(
    ports.graphRead,
    project.id,
    routeKey,
  );
  if (!page) throw new Error(`Page not found for routeKey '${routeKey}'`);

  const action: PageAction | undefined = page.definition.actions?.[actionKey];
  if (!action) throw new Error(`Unknown action '${actionKey}'`);

  const bindingData = await resolvePageBindings(
    ports.graphRead,
    project.id,
    page.definition.bindings,
    page.definition.context ?? {},
  );
  const interp = makeInterpolator(
    bindingData,
    (page.definition.context ?? {}) as Record<string, unknown>,
    payload,
  );

  switch (action.kind) {
    case "create_node":
      await createNode(ports, {
        projectId: project.id,
        catalogKey: action.catalogKey,
        title: String(interp(action.title) ?? "Untitled"),
        properties: interpRecord(action.properties, interp),
      });
      break;
    case "update_node":
      await updateNode(ports, {
        projectId: project.id,
        nodeId: String(interp(action.nodeId)),
        title: action.title !== undefined ? String(interp(action.title)) : undefined,
        properties: action.properties
          ? interpRecord(action.properties, interp)
          : undefined,
      });
      break;
    case "create_edge":
      await createEdge(ports, {
        projectId: project.id,
        catalogKey: action.catalogKey,
        sourceNodeId: String(interp(action.sourceNodeId)),
        targetNodeId: String(interp(action.targetNodeId)),
      });
      break;
    case "delete_edge":
      await deleteEdge(ports.graphWrite, {
        projectId: project.id,
        edgeId: String(interp(action.edgeId)),
      });
      break;
  }

  revalidatePath(`/${orgSlug}/${projectSlug}/p/${routeKey}`);
}
