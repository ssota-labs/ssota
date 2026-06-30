import {
  readLifecycleStatus,
  readNodeContent,
  type GraphEdge,
  type GraphNode,
} from "@ssota/core";
import type { ToolSet } from "ai";
import type { AgentRunContext } from "../engine/types.js";
import type { SandboxHandle } from "@ssota/core";
import type { ConnectionRunState } from "../connections/run-state.js";

/**
 * Shared per-run bag handed to every tool as its v7 `context`. AI SDK v7
 * delivers `toolsContext[toolName]` as each tool's `context` and exposes no
 * shared runtime-context channel into tool execution, so we replicate the same
 * bag under every tool name via {@link buildToolsContext}.
 */
export interface AgentContextBag {
  ssota?: AgentRunContext;
  sandbox?: SandboxHandle;
  credentials?: import("../credentials/provider.js").CredentialProvider;
  connectionState?: ConnectionRunState;
}

/**
 * Build a v7 `toolsContext` that hands the same shared run context `bag` to
 * every tool in `tools`. Tools with no `contextSchema` infer an empty
 * (`{}`) tool-set context, so this populated record is assignable as their
 * `toolsContext`/`prepareCall` return while the runtime forwards
 * `toolsContext[toolName]` into each tool's `context`.
 */
export function buildToolsContext(
  tools: ToolSet | undefined,
  bag: AgentContextBag,
): Record<string, AgentContextBag> {
  const ctx: Record<string, AgentContextBag> = {};
  for (const name of Object.keys(tools ?? {})) ctx[name] = bag;
  return ctx;
}

/** Pull the per-run SSOTA scope injected via the tool `context`. */
export function getRunContext(experimentalContext: unknown): AgentRunContext {
  const ctx = (experimentalContext as { ssota?: AgentRunContext } | undefined)
    ?.ssota;
  if (!ctx) {
    throw new Error("SSOTA run context missing from tool execution context");
  }
  return ctx;
}

/** Pull the credential provider, if this run configured one. */
export function getCredentialProvider(
  experimentalContext: unknown,
): import("../credentials/provider.js").CredentialProvider | undefined {
  return (
    experimentalContext as
      | { credentials?: import("../credentials/provider.js").CredentialProvider }
      | undefined
  )?.credentials;
}

/** Eve-style per-run connection activation state (progressive disclosure). */
export function getConnectionRunState(
  experimentalContext: unknown,
): ConnectionRunState | undefined {
  return (
    experimentalContext as { connectionState?: ConnectionRunState } | undefined
  )?.connectionState;
}

/** Pull the sandbox handle, if this run provisioned one. */
export function getSandbox(experimentalContext: unknown): SandboxHandle {
  const sandbox = (
    experimentalContext as { sandbox?: SandboxHandle } | undefined
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
