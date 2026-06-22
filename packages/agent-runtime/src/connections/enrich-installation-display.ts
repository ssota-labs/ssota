import {
  type ConnectInstallation,
  type CredentialScope,
  normalizeConnectInstallationId,
  resolveCredentialProvider,
} from "../credentials/provider.js";
import { providerOfConnectorUid } from "./connect-credential.js";

const ENRICHMENT_TIMEOUT_MS = 5_000;

type EnrichmentProvider = "slack" | "github" | "notion" | "linear" | "discord";

export interface EnrichConnectInstallationInput {
  connector: string;
  installation: ConnectInstallation;
  scope: CredentialScope;
}

/**
 * Best-effort display-name lookup after Connect has confirmed ids.
 * Never throws — connection recording must succeed even when enrichment fails.
 */
export async function enrichConnectInstallationDisplay(
  input: EnrichConnectInstallationInput,
): Promise<ConnectInstallation> {
  const { connector, installation, scope } = input;
  if (installation.name?.trim()) {
    return installation;
  }
  if (process.env.CONNECT_STUB === "1") {
    return installation;
  }

  const provider = resolveEnrichmentProvider(connector);
  if (!provider) {
    return installation;
  }

  const token = await mintConnectToken(connector, scope, installation);
  if (!token) {
    return installation;
  }

  try {
    const name = await fetchDisplayName(provider, token, installation);
    if (!name?.trim()) {
      return installation;
    }
    return { ...installation, name: name.trim() };
  } catch {
    return installation;
  }
}

function resolveEnrichmentProvider(
  connectorUid: string,
): EnrichmentProvider | null {
  const segment = providerOfConnectorUid(connectorUid);
  if (segment === "oauth" || segment === "notion") return "notion";
  if (
    segment === "slack" ||
    segment === "github" ||
    segment === "linear" ||
    segment === "discord"
  ) {
    return segment;
  }
  return null;
}

async function mintConnectToken(
  connector: string,
  scope: CredentialScope,
  installation: ConnectInstallation,
): Promise<string | null> {
  const credentialProvider = resolveCredentialProvider();
  if (!credentialProvider) return null;

  const installationKey =
    normalizeConnectInstallationId(installation.installationId) ??
    normalizeConnectInstallationId(installation.tenantId);

  const result = await credentialProvider.getToken(connector, {
    projectId: scope.projectId,
    accountId: scope.accountId,
    userId: scope.userId,
    ...(installationKey ? { installationId: installationKey } : {}),
  });
  return result?.token ?? null;
}

async function fetchDisplayName(
  provider: EnrichmentProvider,
  token: string,
  installation: ConnectInstallation,
): Promise<string | undefined> {
  switch (provider) {
    case "slack":
      return fetchSlackWorkspaceName(token);
    case "github":
      return fetchGitHubAccountName(token);
    case "notion":
      return fetchNotionWorkspaceName(token);
    case "linear":
      return fetchLinearOrganizationName(token);
    case "discord":
      return fetchDiscordGuildName(token, installation);
  }
}

async function fetchJson<T>(
  url: string,
  init: RequestInit,
): Promise<T | undefined> {
  const response = await fetch(url, {
    ...init,
    signal: AbortSignal.timeout(ENRICHMENT_TIMEOUT_MS),
  });
  if (!response.ok) return undefined;
  return (await response.json()) as T;
}

async function fetchSlackWorkspaceName(token: string): Promise<string | undefined> {
  const data = await fetchJson<{ ok?: boolean; team?: string }>(
    "https://slack.com/api/auth.test",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
    },
  );
  return data?.ok ? data.team : undefined;
}

async function fetchGitHubAccountName(token: string): Promise<string | undefined> {
  const data = await fetchJson<{ name?: string | null; login?: string }>(
    "https://api.github.com/user",
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
    },
  );
  const name = data?.name?.trim();
  if (name) return name;
  return data?.login?.trim();
}

async function fetchNotionWorkspaceName(token: string): Promise<string | undefined> {
  const data = await fetchJson<{
    name?: string;
    type?: string;
    bot?: { workspace_name?: string };
  }>("https://api.notion.com/v1/users/me", {
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": "2022-06-28",
    },
  });
  const workspaceName = data?.bot?.workspace_name?.trim();
  if (workspaceName) return workspaceName;
  return data?.name?.trim();
}

async function fetchLinearOrganizationName(
  token: string,
): Promise<string | undefined> {
  const data = await fetchJson<{
    data?: { viewer?: { organization?: { name?: string } } };
  }>("https://api.linear.app/graphql", {
    method: "POST",
    headers: {
      Authorization: token,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: "query { viewer { organization { name } } }",
    }),
  });
  return data?.data?.viewer?.organization?.name?.trim();
}

async function fetchDiscordGuildName(
  token: string,
  installation: ConnectInstallation,
): Promise<string | undefined> {
  const guildId =
    normalizeConnectInstallationId(installation.tenantId) ??
    normalizeConnectInstallationId(installation.installationId);
  if (!guildId) return undefined;

  const data = await fetchJson<{ name?: string }>(
    `https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}`,
    {
      headers: {
        Authorization: `Bot ${token}`,
      },
    },
  );
  return data?.name?.trim();
}
