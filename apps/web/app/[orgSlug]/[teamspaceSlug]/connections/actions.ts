"use server";

import { revalidatePath } from "next/cache";
import {
  disconnectComposioAccount,
  listComposioToolkitTools,
  type ComposioToolInfo,
} from "@ssota/agent-runtime";
import { getConnectorToolSettingsPort, getConsolePort } from "@/lib/ports";
import { getCurrentUser } from "@/lib/supabase/server";

/**
 * Resolve the Composio entity (org + signed-in profile) for a project. Tool
 * settings and connections are keyed by this pair.
 */
async function resolveEntity(
  teamspaceId: string,
): Promise<{ orgId: string; profileId: string }> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");
  const project = await getConsolePort().getTeamspaceById(teamspaceId);
  if (!project) throw new Error("Teamspace not found");
  return { orgId: project.organizationId, profileId: user.id };
}

/**
 * Disconnect a single Composio connected account. The connection id is the
 * Composio connected-account id surfaced by the Connectors page. Composio owns
 * the credential, so deleting the connected account is the whole operation.
 */
export async function disconnectConnectionAction(input: {
  teamspaceId: string;
  connectionId: string;
  revalidate: string;
}): Promise<void> {
  const user = await getCurrentUser();
  if (!user) throw new Error("Unauthorized");

  await disconnectComposioAccount(input.connectionId);
  revalidatePath(input.revalidate);
}

export interface ToolkitToolSettings {
  tools: ComposioToolInfo[];
  disabled: string[];
}

/**
 * Load a toolkit's available tools plus the entity's currently-disabled slugs,
 * for the Connectors settings sheet's tool-restriction list.
 */
export async function loadToolkitToolSettingsAction(input: {
  teamspaceId: string;
  toolkit: string;
}): Promise<ToolkitToolSettings> {
  const { orgId, profileId } = await resolveEntity(input.teamspaceId);
  const [tools, disabled] = await Promise.all([
    listComposioToolkitTools(input.toolkit),
    getConnectorToolSettingsPort().getDisabled(orgId, profileId, input.toolkit),
  ]);
  return { tools, disabled };
}

/**
 * Persist the disabled tool slugs for a toolkit. Applied to the agent's Tool
 * Router session on its next run.
 */
export async function setToolkitDisabledAction(input: {
  teamspaceId: string;
  toolkit: string;
  disabled: string[];
  revalidate: string;
}): Promise<void> {
  const { orgId, profileId } = await resolveEntity(input.teamspaceId);
  await getConnectorToolSettingsPort().setDisabled(
    orgId,
    profileId,
    input.toolkit,
    input.disabled,
  );
  revalidatePath(input.revalidate);
}
