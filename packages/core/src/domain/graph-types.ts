import { nodeContentToMarkdown } from "@ssota/contracts";

export interface GraphNode {
  id: string;
  projectId: string;
  nodeCatalogId: string;
  catalogKey: string;
  catalogLabel: string;
  title: string;
  properties: Record<string, unknown>;
  schemaVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface GraphEdge {
  id: string;
  projectId: string;
  edgeCatalogId: string;
  catalogKey: string;
  catalogLabel: string;
  sourceNodeId: string;
  targetNodeId: string;
  properties: Record<string, unknown>;
  createdAt: Date;
}

export interface CreateInitiativeBundleResult {
  initiativeId: string;
  releaseId: string;
  pairedWithEdgeId: string;
}

/** Read lifecycle from properties (dev-workflow convention). */
export function readLifecycleStatus(
  properties: Record<string, unknown>,
): string {
  const value = properties.lifecycleStatus;
  if (typeof value === "string" && value.length > 0) {
    return value;
  }
  return "Draft";
}

/**
 * Read the document body from properties as markdown. Content is stored as a
 * BlockNote document (so the web app renders it richly); we convert it back to
 * markdown here so agents keep reading/writing markdown. Legacy string content
 * passes through unchanged.
 */
export function readNodeContent(
  properties: Record<string, unknown>,
): string | null {
  return nodeContentToMarkdown(properties.content);
}
