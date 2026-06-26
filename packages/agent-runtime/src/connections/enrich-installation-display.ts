import {
  connectUsesAppSubject,
  type ConnectInstallation,
  type CredentialScope,
  normalizeConnectInstallationId,
  resolveCredentialProvider,
} from "../credentials/provider.js";
import {
  resolveProviderApiUrl,
} from "../connections/provider-api-base.js";
import { providerOfConnectorUid } from "./connect-credential.js";

const ENRICHMENT_TIMEOUT_MS = 5_000;

type EnrichmentProvider =
  | "slack"
  | "github"
  | "notion"
  | "linear"
  | "discord"
  | "twitter";

interface EnrichmentResult {
  name?: string;
  tenantId?: string;
  installationId?: string;
}

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
    const result = await fetchEnrichment(provider, token, installation);
    if (!result.name?.trim() && !result.tenantId && !result.installationId) {
      return installation;
    }
    return {
      ...installation,
      ...(result.name?.trim() ? { name: result.name.trim() } : {}),
      ...(result.tenantId
        ? { tenantId: result.tenantId }
        : {}),
      ...(result.installationId
        ? { installationId: result.installationId }
        : {}),
    };
  } catch {
    return installation;
  }
}

function resolveEnrichmentProvider(
  connectorUid: string,
): EnrichmentProvider | null {
  const segment = providerOfConnectorUid(connectorUid);
  if (segment === "oauth" || segment === "notion") return "notion";
  if (segment === "x.com" || segment === "twitter") return "twitter";
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

  const tokenScope = {
    projectId: scope.projectId,
    accountId: scope.accountId,
    ...(installationKey ? { installationId: installationKey } : {}),
  };

  const tryMint = async (userId?: string): Promise<string | null> => {
    try {
      const result = await credentialProvider.getToken(connector, {
        ...tokenScope,
        ...(userId ? { userId } : {}),
      });
      return result?.token ?? null;
    } catch {
      return null;
    }
  };

  // Display enrichment (auth.test, /user, guild list) works with app-install
  // tokens. Slack MCP needs user tokens, but those may be unresolved while the
  // app-subject install token still resolves — try app first for those connectors.
  if (connectUsesAppSubject(connector)) {
    const appToken = await tryMint();
    if (appToken) return appToken;
  }

  if (scope.userId) {
    const userToken = await tryMint(scope.userId);
    if (userToken) return userToken;
  }

  return tryMint();
}

async function fetchEnrichment(
  provider: EnrichmentProvider,
  token: string,
  installation: ConnectInstallation,
): Promise<EnrichmentResult> {
  switch (provider) {
    case "slack": {
      const name = await fetchSlackWorkspaceName(token);
      return name ? { name } : {};
    }
    case "github":
      return fetchGitHubInstallation(token);
    case "notion": {
      const name = await fetchNotionWorkspaceName(token);
      return name ? { name } : {};
    }
    case "linear": {
      const name = await fetchLinearOrganizationName(token);
      return name ? { name } : {};
    }
    case "discord":
      return fetchDiscordGuild(token, installation);
    case "twitter":
      return fetchTwitterProfile(token);
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
    resolveProviderApiUrl("slack", "https://slack.com/api/auth.test"),
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

async function fetchGitHubInstallation(token: string): Promise<EnrichmentResult> {
  const repos = await fetchJson<{
    repositories?: Array<{ owner?: { login?: string; type?: string } }>;
  }>(resolveProviderApiUrl(
    "github",
    "https://api.github.com/installation/repositories?per_page=1",
  ), {
    headers: githubHeaders(token),
  });
  const ownerLogin = repos?.repositories?.[0]?.owner?.login?.trim();
  if (ownerLogin) {
    return { name: ownerLogin };
  }

  const user = await fetchJson<{ name?: string | null; login?: string }>(
    resolveProviderApiUrl("github", "https://api.github.com/user"),
    { headers: githubHeaders(token) },
  );
  const name = user?.name?.trim();
  if (name) return { name };
  const login = user?.login?.trim();
  return login ? { name: login } : {};
}

function githubHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
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
  }>(resolveProviderApiUrl("linear", "https://api.linear.app/graphql"), {
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

async function fetchDiscordGuild(
  token: string,
  installation: ConnectInstallation,
): Promise<EnrichmentResult> {
  const guildId =
    normalizeConnectInstallationId(installation.tenantId) ??
    normalizeConnectInstallationId(installation.installationId);

  if (guildId) {
    const data = await fetchJson<{ name?: string }>(
      `https://discord.com/api/v10/guilds/${encodeURIComponent(guildId)}`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
      },
    );
    const name = data?.name?.trim();
    return name ? { name, tenantId: guildId, installationId: guildId } : {};
  }

  const guilds = await fetchJson<Array<{ id: string; name: string }>>(
    "https://discord.com/api/v10/users/@me/guilds",
    {
      headers: {
        Authorization: `Bot ${token}`,
      },
    },
  );
  if (!guilds?.length) return {};

  if (guilds.length === 1) {
    const guild = guilds[0]!;
    return {
      name: guild.name.trim(),
      tenantId: guild.id,
      installationId: guild.id,
    };
  }

  return {
    name: guilds
      .map((guild) => guild.name.trim())
      .filter(Boolean)
      .slice(0, 3)
      .join(", "),
  };
}

async function fetchTwitterProfile(token: string): Promise<EnrichmentResult> {
  const data = await fetchJson<{
    data?: { id?: string; username?: string; name?: string };
  }>("https://api.x.com/2/users/me?user.fields=username,name", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const user = data?.data;
  const username = user?.username?.trim();
  const displayName = user?.name?.trim();
  const userId = user?.id?.trim();

  let name: string | undefined;
  if (username && displayName) {
    name = `${displayName} (@${username})`;
  } else if (username) {
    name = `@${username}`;
  } else if (displayName) {
    name = displayName;
  }

  return {
    ...(name ? { name } : {}),
    ...(userId ? { tenantId: userId } : {}),
  };
}
