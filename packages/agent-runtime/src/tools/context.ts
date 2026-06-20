import {
  readLifecycleStatus,
  readNodeContent,
  type GraphEdge,
  type GraphNode,
} from "@ssota/core";
import type { AgentRunContext } from "../engine/types.js";
import type { SandboxSession } from "../sandbox/session.js";

/** Pull the per-run SSOTA scope injected via `experimental_context`. */
export function getRunContext(experimentalContext: unknown): AgentRunContext {
  const ctx = (experimentalContext as { ssota?: AgentRunContext } | undefined)
    ?.ssota;
  if (!ctx) {
    throw new Error("SSOTA run context missing from tool execution context");
  }
  return ctx;
}

/** Pull the sandbox session, if this run provisioned one. */
export function getSandbox(experimentalContext: unknown): SandboxSession {
  const sandbox = (
    experimentalContext as { sandbox?: SandboxSession } | undefined
  )?.sandbox;
  if (!sandbox) {
    throw new Error(
      "No sandbox is attached to this run — this task is not dev-capable.",
    );
  }
  return sandbox;
}

export function serializeNode(node: GraphNode) {
  return {
    id: node.id,
    catalogKey: node.catalogKey,
    catalogLabel: node.catalogLabel,
    title: node.title,
    properties: node.properties,
    content: readNodeContent(node.properties),
    lifecycleStatus: readLifecycleStatus(node.properties),
    updatedAt: node.updatedAt.toISOString(),
  };
}

export function serializeEdge(edge: GraphEdge) {
  return {
    id: edge.id,
    catalogKey: edge.catalogKey,
    catalogLabel: edge.catalogLabel,
    sourceNodeId: edge.sourceNodeId,
    targetNodeId: edge.targetNodeId,
    properties: edge.properties,
  };
}
