/**
 * Assemble the agent's connector tools from a Composio Tool Router session.
 * `session.tools()` returns the Tool Router meta-tools (native tool search +
 * multi-execute + manage-connections) formatted for the AI SDK, so the model
 * gets just-in-time access to 1000+ toolkits behind a tiny, stable tool set —
 * no per-provider tool definitions on our side. Per-toolkit tool restrictions
 * (connector_tool_settings) are applied to the session.
 */
import type { ToolSet } from "ai";
import { getComposioClient } from "./client.js";
import { getOrgToolRouterSession, getToolRouterSession } from "./session.js";
import { getConnectorToolSettingsPort } from "../ports.js";

export interface ComposioToolsInput {
  orgId: string;
  profileId: string;
}

/** AI-SDK ToolSet from the user entity's Tool Router session (personal +
 *  ACL-accessible org-shared connections), or `{}` if Composio is off. */
export async function createComposioTools(
  input: ComposioToolsInput,
): Promise<ToolSet> {
  const disabledTools = await getConnectorToolSettingsPort()
    .getDisabledByToolkit(input.orgId, input.profileId)
    .catch(() => ({}) as Record<string, string[]>);

  const session = await getToolRouterSession({ ...input, disabledTools });
  if (!session) return {};
  const tools = await session.tools();
  return tools as ToolSet;
}

/**
 * AI-SDK ToolSet from the org-shared entity (`org_<id>`). Used for runs with no
 * acting user — inbound chat (Slack/Discord mentions), scheduler, and task
 * runtimes — so they reach the organization's shared connections.
 */
export async function createComposioOrgTools(input: {
  orgId: string;
}): Promise<ToolSet> {
  const session = await getOrgToolRouterSession({ orgId: input.orgId });
  if (!session) return {};
  const tools = await session.tools();
  return tools as ToolSet;
}

export interface ComposioToolInfo {
  slug: string;
  name: string;
  description?: string;
}

/**
 * List the available tools for a toolkit (for the Connectors settings sheet's
 * tool-restriction UI). Returns `[]` when Composio is not configured.
 */
export async function listComposioToolkitTools(
  toolkit: string,
): Promise<ComposioToolInfo[]> {
  const composio = getComposioClient();
  if (!composio) return [];
  const list = await composio.tools.getRawComposioTools({ toolkits: [toolkit] });
  const items = Array.isArray(list)
    ? list
    : ((list as { items?: unknown[] }).items ?? []);
  return (items as Array<{ slug: string; name: string; description?: string }>).map(
    (tool) => ({
      slug: tool.slug,
      name: tool.name,
      description: tool.description,
    }),
  );
}
