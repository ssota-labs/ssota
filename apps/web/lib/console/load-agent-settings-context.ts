import type { WorkerIndex, SkillIndex } from "@ssota/contracts";
import type { ConnectorDef } from "@/lib/connect/connectors";
import type { InboundChannelStatus } from "@/lib/connect/inbound-channels";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";
import { mergeAgentToolsConnectionSeed } from "@/lib/console/agent-settings-connection-seed";
import {
  getOrCreateProjectAccount,
  getSchedulePort,
  getWorkerPort,
  getSkillPort,
} from "@/lib/ports";

export type AgentScheduleSummary = {
  id: string;
  agentDefinitionId: string;
  cronExpression: string;
  timezone: string;
  enabled: boolean;
};

export type AgentSettingsContext = {
  storedWorkers: WorkerIndex[];
  skillCatalog: SkillIndex[];
  schedules: AgentScheduleSummary[];
  connectors: ConnectorDef[];
  connections: {
    user: ConnectorConnection[];
    org: ConnectorConnection[];
  };
  inboundChannels: InboundChannelStatus[];
  accountId: string;
  channelsHref: string;
};

export async function loadAgentSettingsContext(
  teamspaceId: string,
  organizationId: string,
  channelsHref: string,
): Promise<AgentSettingsContext> {
  const account = await getOrCreateProjectAccount(teamspaceId);
  const [storedWorkers, schedules, inboundChannels, skillCatalog] =
    await Promise.all([
      getWorkerPort(teamspaceId).listWorkers("tool"),
      getSchedulePort(teamspaceId, account.id).list(),
      import("@/lib/connect/inbound-channel-status").then((m) =>
        m.loadInboundChannelStatus(teamspaceId),
      ),
      getSkillPort(teamspaceId).then((port) =>
        port.listForOrganization(organizationId),
      ),
    ]);

  const { getConnectors } = await import("@/lib/connect/connectors");

  return {
    storedWorkers,
    skillCatalog,
    schedules: schedules.map((s) => ({
      id: s.id,
      agentDefinitionId: s.agentDefinitionId,
      cronExpression: s.cronExpression,
      timezone: s.timezone,
      enabled: s.enabled,
    })),
    connectors: getConnectors(),
    connections: { user: [], org: [] },
    inboundChannels,
    accountId: account.id,
    channelsHref,
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

  return mergeAgentToolsConnectionSeed({
    user: userConns.filter((c: ComposioConn) => c.active).map(toConnection),
    org: orgConns.filter((c: ComposioConn) => c.active).map(toConnection),
  });
}
