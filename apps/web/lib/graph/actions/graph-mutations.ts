"use server";

import type { NodeType } from "@ssota/contracts";
import {
  createInitiativeBundleInputSchema,
  createNodeInputSchema,
  updateNodeInputSchema,
} from "@ssota/contracts/graph";
import {
  createInitiativeBundle,
  createNode,
  GraphError,
  updateNode,
} from "@ssota/core";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { withConsolePaths } from "@/lib/console/revalidate";
import { projectPath, type ProjectRouteContext } from "@/lib/console/paths";
import { getGraphDeps } from "@/lib/graph/graph-deps";
import { getCurrentUser } from "@/lib/supabase/server";

function revalidateConsole(paths: string[]) {
  for (const path of withConsolePaths(paths)) {
    revalidatePath(path);
  }
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  return user;
}

function mergeNodeProperties(
  properties: Record<string, unknown> | undefined,
  extras?: {
    content?: string | null;
    lifecycleStatus?: "Draft" | "Active" | "Archived";
  },
): Record<string, unknown> {
  const merged = { ...(properties ?? {}) };
  if (extras?.content !== undefined) {
    merged.content = extras.content;
  }
  if (extras?.lifecycleStatus !== undefined) {
    merged.lifecycleStatus = extras.lifecycleStatus;
  }
  return merged;
}

export async function createGraphNodeAction(input: {
  projectId: string;
  catalogKey: NodeType;
  title: string;
  properties?: Record<string, unknown>;
  content?: string | null;
  lifecycleStatus?: "Draft" | "Active" | "Archived";
  initiativeId?: string;
  revalidatePaths?: string[];
}) {
  await requireAuth();
  const deps = getGraphDeps(input.projectId);
  const parsed = createNodeInputSchema.parse({
    projectId: input.projectId,
    catalogKey: input.catalogKey,
    title: input.title,
    properties: mergeNodeProperties(input.properties, {
      content: input.content,
      lifecycleStatus: input.lifecycleStatus,
    }),
    initiativeId: input.initiativeId,
  });

  const node = await createNode(deps, parsed);
  revalidateConsole(input.revalidatePaths ?? []);
  return node;
}

export async function updateGraphNodeAction(input: {
  projectId: string;
  nodeId: string;
  title?: string;
  properties?: Record<string, unknown>;
  content?: string | null;
  lifecycleStatus?: "Draft" | "Active" | "Archived";
  revalidatePaths?: string[];
}) {
  await requireAuth();
  const deps = getGraphDeps(input.projectId);

  let properties = input.properties;
  if (input.content !== undefined || input.lifecycleStatus !== undefined) {
    const existing = await deps.graphRead.getNode({
      projectId: input.projectId,
      nodeId: input.nodeId,
    });
    properties = mergeNodeProperties(
      { ...(existing?.properties ?? {}), ...(input.properties ?? {}) },
      {
        content: input.content,
        lifecycleStatus: input.lifecycleStatus,
      },
    );
  }

  const parsed = updateNodeInputSchema.parse({
    projectId: input.projectId,
    nodeId: input.nodeId,
    title: input.title,
    properties,
  });

  const node = await updateNode(deps, parsed);
  revalidateConsole(input.revalidatePaths ?? []);
  return node;
}

export async function createInitiativeBundleAction(input: {
  projectId: string;
  initiativeTitle: string;
  releaseVersion: string;
  ctx: ProjectRouteContext;
  redirectToPrd?: boolean;
}) {
  await requireAuth();
  const deps = getGraphDeps(input.projectId);
  const parsed = createInitiativeBundleInputSchema.parse({
    projectId: input.projectId,
    initiativeTitle: input.initiativeTitle,
    releaseVersion: input.releaseVersion,
  });

  const result = await createInitiativeBundle(deps, parsed);
  revalidateConsole([
    projectPath(input.ctx, "initiatives"),
    projectPath(input.ctx, "overview"),
    projectPath(input.ctx, "research", "hypotheses"),
  ]);

  if (input.redirectToPrd) {
    redirect(
      projectPath(
        input.ctx,
        "initiatives",
        result.initiativeId,
        "planning",
        "prd",
      ),
    );
  }

  return result;
}

export async function createInitiativeFromHypothesisAction(input: {
  projectId: string;
  hypothesisId: string;
  initiativeTitle: string;
  releaseVersion: string;
  ctx: ProjectRouteContext;
}) {
  await requireAuth();
  const deps = getGraphDeps(input.projectId);

  const hypothesis = await deps.graphRead.getNode({
    projectId: input.projectId,
    nodeId: input.hypothesisId,
  });
  if (!hypothesis || hypothesis.catalogKey !== "hypothesis") {
    throw new GraphError("NOT_FOUND", "Hypothesis not found");
  }

  await updateNode(deps, {
    projectId: input.projectId,
    nodeId: input.hypothesisId,
    properties: {
      ...hypothesis.properties,
      status: "validated",
    },
  });

  const parsed = createInitiativeBundleInputSchema.parse({
    projectId: input.projectId,
    initiativeTitle: input.initiativeTitle,
    releaseVersion: input.releaseVersion,
  });

  const result = await createInitiativeBundle(deps, parsed);
  revalidateConsole([
    projectPath(input.ctx, "initiatives"),
    projectPath(input.ctx, "overview"),
    projectPath(input.ctx, "research", "hypotheses"),
  ]);

  redirect(
    projectPath(
      input.ctx,
      "initiatives",
      result.initiativeId,
      "planning",
      "prd",
    ),
  );
}
