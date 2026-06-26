/**
 * Assemble the agent's connector tools from a Composio Tool Router session.
 * `session.tools()` returns the Tool Router meta-tools (native tool search +
 * multi-execute + manage-connections) formatted for the AI SDK, so the model
 * gets just-in-time access to 1000+ toolkits behind a tiny, stable tool set —
 * no per-provider tool definitions on our side.
 */
import type { ToolSet } from "ai";
import { getToolRouterSession } from "./session.js";

export interface ComposioToolsInput {
  orgId: string;
  profileId: string;
}

/** AI-SDK ToolSet from the entity's Tool Router session, or `{}` if Composio is off. */
export async function createComposioTools(
  input: ComposioToolsInput,
): Promise<ToolSet> {
  const session = await getToolRouterSession(input);
  if (!session) return {};
  const tools = await session.tools();
  return tools as ToolSet;
}
