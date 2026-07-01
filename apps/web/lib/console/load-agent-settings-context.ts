import type { ScriptToolIndex } from "@ssota/contracts";
import type { ConnectorDef } from "@/lib/connect/connectors";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import {
  getOrCreateProjectAccount,
  getSchedulePort,
  getScriptToolPort,
} from "@/lib/ports";

export type AgentScheduleSummary = {
  id: string;
  agentDefinitionId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
};

export type AgentSettingsContext = {
  scriptTools: ScriptToolIndex[];
  schedules: AgentScheduleSummary[];
  connectors: ConnectorDef[];
  connections: {
    user: ConnectorConnection[];
    org: ConnectorConnection[];
  };
  accountId: string;
};

export async function loadAgentSettingsContext(
  teamspaceId: string,
): Promise<AgentSettingsContext> {
  const account = await getOrCreateProjectAccount(teamspaceId);
  const [scriptTools, schedules] = await Promise.all([
    getScriptToolPort(teamspaceId).listScriptTools(),
    getSchedulePort(teamspaceId, account.id).list(),
  ]);

  const { getConnectors } = await import("@/lib/connect/connectors");

  return {
    scriptTools,
    schedules: schedules.map((s) => ({
      id: s.id,
      agentDefinitionId: s.agentDefinitionId,
      cronExpression: s.cronExpression,
      timezone: s.timezone,
      enabled: s.enabled,
    })),
    connectors: getConnectors(),
    connections: { user: [], org: [] },
    accountId: account.id,
  };
}

export async function loadAgentSettingsConnections(
  teamspaceId: string,
  orgId: string,
  profileId: string,
): Promise<{
  user: ConnectorConnection[];
  org: ConnectorConnection[];
}> {
  const {
    composioOrgUserId,
    composioUserId,
    listComposioConnections,
  } = await import("@ssota/agent-runtime");

  const toConnection = (c: {
    connectedAccountId: string;
    toolkit: string;
    active: boolean;
  }) => ({
    id: c.connectedAccountId,
    connector: c.toolkit,
    name: null,
  });

  const [userConns, orgConns] = await Promise.all([
    listComposioConnections(
      composioUserId({ orgId, profileId }),
    ),
    listComposioConnections(composioOrgUserId(orgId)),
  ]);

  type ComposioConn = Awaited<
    ReturnType<typeof listComposioConnections>
  >[number];

  return {
    user: userConns.filter((c: ComposioConn) => c.active).map(toConnection),
    org: orgConns.filter((c: ComposioConn) => c.active).map(toConnection),
  };
}
