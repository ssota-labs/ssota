"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  createEdge,
  createInitiativeBundle,
  createNode,
  deleteEdge,
  deleteNode,
  resolvePageBindings,
  updateNode,
} from "@ssota/core";
import {
  createEdgeInputSchema,
  createNodeInputSchema,
  deleteEdgeInputSchema,
  deleteNodeInputSchema,
  updateNodeInputSchema,
} from "@ssota/contracts/graph";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getPagePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";
import {
  orgPath,
  type OrgRouteContext,
} from "@/lib/console/paths";

/**
 * Server-side executor for the JSON-render action layer. The client never sends
 * a mutation — it sends an `actionKey` + collected `input`. The server re-reads
 * the page's `actions[actionKey]` descriptor authoritatively, interpolates its
 * value-refs (`$input` / `$ctx` / `$binding`), and dispatches to the matching
 * graph use-case. This is the production counterpart to the renderer's
 * `onAction`; routes bind it via an inline server-action closure (which supplies
 * `subjectNodeId` + the paths to revalidate).
 */
export type RunPageActionInput = {
  teamspaceId: string;
  pageId: string;
  actionKey: string;
  /** Client-collected form payload — only ever read through `$input` refs. */
  input: Record<string, unknown>;
  /** The page's anchor node (page.subjectNodeId for /p; the URL node for /n). */
  subjectNodeId?: string | null;
  /** When set, create_initiative_bundle redirects into the new initiative drill-in. */
  routeCtx?: OrgRouteContext;
  revalidate?: string[];
};

type ValueRef =
  | { $input: string }
  | { $ctx: string }
  | { $binding: string };

type Scopes = {
  input: Record<string, unknown>;
  ctx: Record<string, unknown>;
  bindingData: Record<string, unknown>;
};

function isValueRef(value: unknown): value is ValueRef {
  return (
    !!value &&
    typeof value === "object" &&
    !Array.isArray(value) &&
    ("$input" in value || "$ctx" in value || "$binding" in value)
  );
}

/** Resolve a dotted path (e.g. `rows.0.id`) into the resolved binding data. */
function getByPath(root: unknown, path: string): unknown {
  return path.split(".").reduce<unknown>((acc, key) => {
    if (acc == null) return undefined;
    return (acc as Record<string, unknown>)[key];
  }, root);
}

function resolveParam(param: unknown, scopes: Scopes): unknown {
  if (!isValueRef(param)) return param;
  if ("$input" in param) return scopes.input[param.$input];
  if ("$ctx" in param) return scopes.ctx[param.$ctx];
  return getByPath(scopes.bindingData, param.$binding);
}

function resolveProps(
  props: Record<string, unknown> | undefined,
  scopes: Scopes,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(props ?? {})) {
    out[key] = resolveParam(value, scopes);
  }
  return out;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export async function runPageAction(args: RunPageActionInput): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  const page = await getPagePort(args.teamspaceId).getPage(args.pageId);
  if (!page) throw new Error(`Page not found: ${args.pageId}`);

  const descriptor = page.actions[args.actionKey];
  if (!descriptor) throw new Error(`Unknown action: ${args.actionKey}`);

  const deps = getGraphDeps(args.teamspaceId);

  // Build interpolation scopes. `subject` is the page's anchor node (generic
  // replacement for initiative-scoping), exposed to `$ctx` and to `traverse`
  // bindings; `$binding` refs read the page's resolved binding data.
  const ctx: Record<string, unknown> = {};
  const subjectId = args.subjectNodeId ?? page.subjectNodeId ?? null;
  if (subjectId) {
    const subject = await deps.graphRead.getNodeById(subjectId);
    if (subject && subject.teamspaceId === args.teamspaceId) {
      ctx.subjectNodeId = subject.id;
      ctx.subjectId = subject.id;
      ctx.subject = {
        id: subject.id,
        catalogKey: subject.catalogKey,
        title: subject.title,
        properties: subject.properties,
      };
    }
  }
  const bindingData = await resolvePageBindings(
    deps.graphRead,
    args.teamspaceId,
    page.bindings,
    ctx,
  );

  const scopes: Scopes = { input: args.input ?? {}, ctx, bindingData };

  switch (descriptor.kind) {
    case "create_node": {
      const subject = ctx.subject;
      const subjectInitiativeId =
        subject &&
        typeof subject === "object" &&
        "catalogKey" in subject &&
        (subject as { catalogKey: string }).catalogKey === "initiative" &&
        "id" in subject
          ? String((subject as { id: string }).id)
          : undefined;
      const parsed = createNodeInputSchema.parse({
        teamspaceId: args.teamspaceId,
        catalogKey: descriptor.catalogKey,
        title: asString(resolveParam(descriptor.title, scopes)) ?? "Untitled",
        properties: resolveProps(descriptor.properties, scopes),
        initiativeId: subjectInitiativeId,
      });
      await createNode(deps, parsed);
      break;
    }
    case "update_node": {
      const nodeId = asString(resolveParam(descriptor.nodeId, scopes));
      if (!nodeId) throw new Error("update_node: missing nodeId");
      let properties = descriptor.properties
        ? resolveProps(descriptor.properties, scopes)
        : undefined;
      if (descriptor.merge && properties) {
        const existing = await deps.graphRead.getNode({
          teamspaceId: args.teamspaceId,
          nodeId,
        });
        properties = { ...(existing?.properties ?? {}), ...properties };
      }
      const title =
        descriptor.title !== undefined
          ? asString(resolveParam(descriptor.title, scopes))
          : undefined;
      const parsed = updateNodeInputSchema.parse({
        teamspaceId: args.teamspaceId,
        nodeId,
        title,
        properties,
      });
      await updateNode(deps, parsed);
      break;
    }
    case "create_edge": {
      const parsed = createEdgeInputSchema.parse({
        teamspaceId: args.teamspaceId,
        catalogKey: descriptor.catalogKey,
        sourceNodeId: asString(resolveParam(descriptor.sourceNodeId, scopes)),
        targetNodeId: asString(resolveParam(descriptor.targetNodeId, scopes)),
      });
      await createEdge(deps, parsed);
      break;
    }
    case "delete_edge": {
      const parsed = deleteEdgeInputSchema.parse({
        teamspaceId: args.teamspaceId,
        edgeId: asString(resolveParam(descriptor.edgeId, scopes)),
      });
      await deleteEdge(deps.graphWrite, parsed);
      break;
    }
    case "set_node_property": {
      const nodeId = asString(resolveParam(descriptor.nodeId, scopes));
      if (!nodeId) throw new Error("set_node_property: missing nodeId");
      const field = asString(resolveParam(descriptor.field, scopes));
      if (!field) throw new Error("set_node_property: missing field");
      const value = resolveParam(descriptor.value, scopes);
      // `title` lives on the node row; every other field is a property. Merge so a
      // single-field edit never clobbers the node's other properties.
      if (field === "title") {
        const parsed = updateNodeInputSchema.parse({
          teamspaceId: args.teamspaceId,
          nodeId,
          title: asString(value),
        });
        await updateNode(deps, parsed);
      } else {
        const existing = await deps.graphRead.getNode({
          teamspaceId: args.teamspaceId,
          nodeId,
        });
        const parsed = updateNodeInputSchema.parse({
          teamspaceId: args.teamspaceId,
          nodeId,
          properties: { ...(existing?.properties ?? {}), [field]: value },
        });
        await updateNode(deps, parsed);
      }
      break;
    }
    case "delete_node": {
      const parsed = deleteNodeInputSchema.parse({
        teamspaceId: args.teamspaceId,
        nodeId: asString(resolveParam(descriptor.nodeId, scopes)),
      });
      await deleteNode(deps.graphWrite, parsed);
      break;
    }
    case "create_initiative_bundle": {
      const initiativeTitle = asString(
        resolveParam(descriptor.initiativeTitle, scopes),
      );
      const releaseVersion = asString(
        resolveParam(descriptor.releaseVersion, scopes),
      );
      if (!initiativeTitle || !releaseVersion) {
        throw new Error("create_initiative_bundle: missing title or version");
      }
      const result = await createInitiativeBundle(deps, {
        teamspaceId: args.teamspaceId,
        initiativeTitle,
        releaseVersion,
      });
      if (args.routeCtx) {
        redirect(orgPath(args.routeCtx, "n", result.initiativeId));
      }
      break;
    }
  }

  for (const path of args.revalidate ?? []) revalidatePath(path);
}
