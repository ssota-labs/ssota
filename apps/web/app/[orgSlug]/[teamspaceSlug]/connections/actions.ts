"use server";

import { revalidatePath } from "next/cache";
import {
  composioOrgUserId,
  composioUserId,
  disconnectComposioAccount,
  listComposioConnections,
  listComposioToolkitTools,
  type ComposioToolInfo,
} from "@ssota/agent-runtime";
import type { ConnectorConnectScope } from "@/lib/connect/authorize-href";
import {
  AGENT_TOOLS_CONNECTION_SEED,
  shouldMergeAgentToolsConnectionSeed,
} from "@/lib/console/agent-settings-connection-seed";
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

async function listToolkitConnectionIds(input: {
  orgId: string;
  profileId: string;
  toolkit: string;
  scope: ConnectorConnectScope;
}): Promise<string[]> {
  const userId =
    input.scope === "org"
      ? composioOrgUserId(input.orgId)
      : composioUserId({ orgId: input.orgId, profileId: input.profileId });
  const live = await listComposioConnections(userId);
  const ids = live
    .filter((c) => c.active && c.toolkit === input.toolkit)
    .map((c) => c.connectedAccountId);

  if (shouldMergeAgentToolsConnectionSeed()) {
    const seed =
      input.scope === "org"
        ? AGENT_TOOLS_CONNECTION_SEED.org
        : AGENT_TOOLS_CONNECTION_SEED.user;
    for (const row of seed.filter((s) => s.connector === input.toolkit)) {
      if (!ids.includes(row.id)) ids.push(row.id);
    }
  }

  return ids;
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

export interface ConnectionToolSettings {
  tools: ComposioToolInfo[];
  disabled: string[];
}

/**
 * Load a connected account's available tools plus currently-disabled slugs,
 * for the Connections settings sheet's tool-restriction list.
 */
export async function loadConnectionToolSettingsAction(input: {
  teamspaceId: string;
  connectionId: string;
  toolkit: string;
  scope: ConnectorConnectScope;
}): Promise<ConnectionToolSettings> {
  const { orgId, profileId } = await resolveEntity(input.teamspaceId);
  const port = getConnectorToolSettingsPort();

  const connectionIds = await listToolkitConnectionIds({
    orgId,
    profileId,
    toolkit: input.toolkit,
    scope: input.scope,
  });
  await port.migrateLegacyToolkitToConnections(
    orgId,
    profileId,
    input.toolkit,
    connectionIds,
  );

  const [tools, disabled] = await Promise.all([
    listComposioToolkitTools(input.toolkit),
    port.getDisabled(orgId, profileId, input.connectionId, input.toolkit),
  ]);
  return { tools, disabled };
}

/**
 * Persist disabled tool slugs for a single connected account.
 */
export async function setConnectionDisabledAction(input: {
  teamspaceId: string;
  connectionId: string;
  toolkit: string;
  disabled: string[];
  revalidate: string;
}): Promise<void> {
  const { orgId, profileId } = await resolveEntity(input.teamspaceId);
  await getConnectorToolSettingsPort().setDisabled(
    orgId,
    profileId,
    input.connectionId,
    input.toolkit,
    input.disabled,
  );
  revalidatePath(input.revalidate);
}
