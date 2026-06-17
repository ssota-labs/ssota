"use server";

import {
  uiComponentDocumentSchema,
  type UiComponentDocument,
} from "@ssota/contracts/catalog";
import { GraphError } from "@ssota/core";
import { revalidatePath } from "next/cache";
import { withConsolePaths } from "@/lib/console/revalidate";
import {
  collectProjectRefs,
  detectDirectCycle,
  uniqueProjectRefNodeIds,
} from "@/lib/design-studio/composition";
import { updateGraphNodeAction } from "@/lib/graph/actions/graph-mutations";
import { syncComposedOfEdges } from "@/lib/graph/actions/sync-composed-of-edges";
import { getGraphDeps } from "@/lib/graph/graph-deps";

function revalidateConsole(paths: string[]) {
  for (const path of withConsolePaths(paths)) {
    revalidatePath(path);
  }
}

export async function deployUiComponentAction(input: {
  projectId: string;
  nodeId: string;
  document: UiComponentDocument;
  revalidatePaths: string[];
}) {
  const document = uiComponentDocumentSchema.parse(input.document);
  const deps = getGraphDeps(input.projectId);
  const existing = await deps.graphRead.getNode({
    projectId: input.projectId,
    nodeId: input.nodeId,
  });

  if (!existing || existing.nodeType !== "ui_component") {
    throw new Error("UI component not found");
  }

  const refNodeIds = uniqueProjectRefNodeIds(collectProjectRefs(document.root));

  const childContents: Record<string, string | null | undefined> = {};
  for (const refNodeId of refNodeIds) {
    const refNode = await deps.graphRead.getNode({
      projectId: input.projectId,
      nodeId: refNodeId,
    });
    if (!refNode || refNode.nodeType !== "ui_component") {
      throw new GraphError(
        "VALIDATION_FAILED",
        `Referenced component '${refNodeId}' was not found in this project`,
      );
    }
    childContents[refNodeId] = refNode.content;
  }

  const cycleError = detectDirectCycle(
    input.nodeId,
    document,
    childContents,
  );
  if (cycleError) {
    throw new GraphError("VALIDATION_FAILED", cycleError);
  }

  const nextProperties = { ...existing.properties };
  delete nextProperties.draft;

  await updateGraphNodeAction({
    projectId: input.projectId,
    nodeId: input.nodeId,
    content: JSON.stringify(document),
    properties: nextProperties,
    lifecycleStatus: "Active",
    revalidatePaths: input.revalidatePaths,
  });

  await syncComposedOfEdges({
    projectId: input.projectId,
    sourceNodeId: input.nodeId,
    targetNodeIds: refNodeIds,
  });

  revalidateConsole(input.revalidatePaths);
}
