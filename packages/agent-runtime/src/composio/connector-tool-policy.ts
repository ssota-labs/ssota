import type { AgentConnectorBinding } from "@ssota/contracts";
import {
  deriveApprovalToolsByToolkit,
  deriveBlockedToolsByToolkit,
} from "@ssota/contracts";
import { composioMetaToolSchemas } from "./meta-tool-schemas.js";

export function mergeDisabledToolsByToolkit(
  globalDisabled: Record<string, string[]>,
  agentBlocked: Record<string, string[]>,
): Record<string, string[]> {
  const keys = new Set([
    ...Object.keys(globalDisabled),
    ...Object.keys(agentBlocked),
  ]);
  const merged: Record<string, string[]> = {};
  for (const toolkit of keys) {
    const slugs = [
      ...new Set([
        ...(globalDisabled[toolkit] ?? []),
        ...(agentBlocked[toolkit] ?? []),
      ]),
    ].sort();
    if (slugs.length > 0) merged[toolkit] = slugs;
  }
  return merged;
}

export function flattenToolSlugsByToolkit(
  byToolkit: Record<string, string[]>,
): Set<string> {
  return new Set(Object.values(byToolkit).flat());
}

export function parseMultiExecuteToolSlugs(input: unknown): string[] {
  const parsed = composioMetaToolSchemas.COMPOSIO_MULTI_EXECUTE_TOOL.safeParse(
    input,
  );
  if (!parsed.success) return [];
  return parsed.data.tools.map((tool) => tool.tool_slug);
}

export function resolveAgentConnectorToolPolicy(bindings?: AgentConnectorBinding[]) {
  const list = bindings ?? [];
  return {
    blockedByToolkit: deriveBlockedToolsByToolkit(list),
    approvalByToolkit: deriveApprovalToolsByToolkit(list),
    blockedSlugs: flattenToolSlugsByToolkit(deriveBlockedToolsByToolkit(list)),
    approvalSlugs: flattenToolSlugsByToolkit(
      deriveApprovalToolsByToolkit(list),
    ),
  };
}

export function findBlockedMultiExecuteSlugs(
  toolSlugs: Iterable<string>,
  globalDisabledByToolkit: Record<string, string[]>,
  agentBindings?: AgentConnectorBinding[],
): string[] {
  const blocked = flattenToolSlugsByToolkit(
    mergeDisabledToolsByToolkit(
      globalDisabledByToolkit,
      deriveBlockedToolsByToolkit(agentBindings ?? []),
    ),
  );
  return [...new Set(toolSlugs)].filter((slug) => blocked.has(slug)).sort();
}

export function findApprovalRequiredMultiExecuteSlugs(
  toolSlugs: Iterable<string>,
  agentBindings?: AgentConnectorBinding[],
  approvedSlugs?: Iterable<string>,
): string[] {
  const approval = flattenToolSlugsByToolkit(
    deriveApprovalToolsByToolkit(agentBindings ?? []),
  );
  const approved = new Set(approvedSlugs ?? []);
  return [...new Set(toolSlugs)]
    .filter((slug) => approval.has(slug) && !approved.has(slug))
    .sort();
}
