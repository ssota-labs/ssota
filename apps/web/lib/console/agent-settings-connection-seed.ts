import type { AgentConnectorBinding } from "@ssota/contracts";
import { deriveEnabledConnectorProviders } from "@ssota/contracts";
import type { ConnectorConnection } from "@/components/connectors/connectors-view";

/** Dev/stub preview — multiple accounts per provider and scope. */
export const AGENT_TOOLS_CONNECTION_SEED: {
  user: ConnectorConnection[];
  org: ConnectorConnection[];
} = {
  user: [
    {
      id: "seed-notion-user-1",
      connector: "notion",
      name: "Alex — Personal Workspace",
    },
    {
      id: "seed-notion-user-2",
      connector: "notion",
      name: "Side Projects",
    },
    {
      id: "seed-todoist-user-1",
      connector: "todoist",
      name: "alex@ssota.ai",
    },
    {
      id: "seed-github-user-1",
      connector: "github",
      name: "alex-dev",
    },
    {
      id: "seed-gmail-user-1",
      connector: "gmail",
      name: "alex@ssota.ai",
    },
  ],
  org: [
    {
      id: "seed-notion-org-1",
      connector: "notion",
      name: "SSOTA Labs Wiki",
    },
    {
      id: "seed-notion-org-2",
      connector: "notion",
      name: "Product Roadmap",
    },
    {
      id: "seed-linear-org-1",
      connector: "linear",
      name: "SSOTA Engineering",
    },
    {
      id: "seed-slack-org-1",
      connector: "slack",
      name: "ssota-labs.slack.com",
    },
  ],
};

/** Dev/stub preview — one bound Notion account on main agent Tools card. */
export const MAIN_AGENT_CONNECTOR_BINDING_SEED: AgentConnectorBinding[] = [
  {
    connectionId: "seed-notion-user-1",
    provider: "notion",
    scope: "user",
    accountLabel: "Alex — Personal Workspace",
  },
];

export function shouldMergeAgentToolsConnectionSeed(): boolean {
  return (
    process.env.NODE_ENV === "development" ||
    process.env.AGENT_TOOLS_CONNECTION_SEED === "1" ||
    process.env.CONNECT_STUB === "1"
  );
}

export function mergeAgentToolsConnectionSeed(connections: {
  user: ConnectorConnection[];
  org: ConnectorConnection[];
}): { user: ConnectorConnection[]; org: ConnectorConnection[] } {
  if (!shouldMergeAgentToolsConnectionSeed()) {
    return connections;
  }

  const mergeScope = (
    live: ConnectorConnection[],
    seed: ConnectorConnection[],
  ) => {
    const seen = new Set(live.map((c) => c.id));
    const extras = seed.filter((c) => !seen.has(c.id));
    return extras.length > 0 ? [...live, ...extras] : live;
  };

  return {
    user: mergeScope(connections.user, AGENT_TOOLS_CONNECTION_SEED.user),
    org: mergeScope(connections.org, AGENT_TOOLS_CONNECTION_SEED.org),
  };
}

export function mergeMainAgentConnectorBindingSeed<
  T extends {
    connectorBindings?: AgentConnectorBinding[];
    enabledConnectorProviders?: string[];
  },
>(runPolicy: T): T {
  if (!shouldMergeAgentToolsConnectionSeed()) {
    return runPolicy;
  }

  const existing = runPolicy.connectorBindings ?? [];
  const extras = MAIN_AGENT_CONNECTOR_BINDING_SEED.filter(
    (seed) =>
      !existing.some(
        (binding) =>
          binding.scope === seed.scope &&
          binding.connectionId === seed.connectionId,
      ),
  );
  if (extras.length === 0) {
    return runPolicy;
  }

  const connectorBindings = [...existing, ...extras];
  return {
    ...runPolicy,
    connectorBindings,
    enabledConnectorProviders: deriveEnabledConnectorProviders({
      connectorBindings,
    }),
  };
}
