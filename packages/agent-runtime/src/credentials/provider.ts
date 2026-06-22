/**
 * Per-account credential seam (Phase 6 — Vercel Connect). External-service
 * tools resolve a short-lived, scoped token at execution time instead of
 * reading long-lived secrets from env. Keyed by connector + the run's
 * project/account so each tenant's agent uses its own installation's token.
 *
 * The production implementation wraps Vercel Connect's `getToken()`; an env
 * provider is included for local/dev. The agent never sees the raw token —
 * tools consume the provider, the model only sees results.
 */
export interface CredentialScope {
  projectId: string;
  accountId?: string;
  /**
   * Provider installation to scope the token to (Slack team id, GitHub org id).
   * Resolved per (account, connector) before the call. Omit for the connector's
   * default installation (single-tenant connectors).
   */
  installationId?: string;
  /**
   * Connect user-subject id (Supabase auth user). Required for oauth/* and linear/*
   * at authorize/callback/getToken; omitted for slack/github/discord app installs.
   */
  userId?: string;
}

/** Scope for `startConnectAuthorization` — Vercel Connect requires a user subject. */
export interface ConnectAuthorizationScope extends CredentialScope {
  /** Signed-in user id (e.g. Supabase `auth.users.id`). */
  userId: string;
}

export interface CredentialToken {
  token: string;
  expiresAt?: string;
}

export interface CredentialProvider {
  /** Resolve a token for a connector (e.g. "shopify", "slack"), or null. */
  getToken(
    connector: string,
    scope: CredentialScope,
  ): Promise<CredentialToken | null>;
}

function envKey(connector: string): string {
  return `CONNECTOR_${connector.toUpperCase().replace(/[^A-Z0-9]/g, "_")}_TOKEN`;
}

/** Slack/GitHub/Discord mint app-subject installation tokens; oauth/* and linear/* use user subject. */
export function connectUsesAppSubject(connectorUid: string): boolean {
  const provider = connectorUid.split("/")[0] ?? connectorUid;
  return provider === "slack" || provider === "github" || provider === "discord";
}

type ConnectTokenSubject =
  | { type: "app" }
  | { type: "user"; id: string };

function resolveConnectTokenSubject(
  connectorUid: string,
  scope: CredentialScope,
): ConnectTokenSubject {
  if (connectUsesAppSubject(connectorUid)) {
    return { type: "app" };
  }
  if (!scope.userId) {
    throw new Error(
      `userId is required for user-subject connector '${connectorUid}'`,
    );
  }
  return { type: "user", id: scope.userId };
}

/**
 * Subject for `getConnectInstallation` right after `startConnectAuthorization`.
 * Connect records the install under the same user subject used to start the
 * flow; app-subject token minting comes later via `getToken` + installationId.
 */
export function resolveConnectCallbackSubject(
  connectorUid: string,
  scope: CredentialScope,
): ConnectTokenSubject {
  if (scope.userId) {
    return { type: "user", id: scope.userId };
  }
  return resolveConnectTokenSubject(connectorUid, scope);
}

/**
 * Dev/local provider: reads `CONNECTOR_<NAME>_TOKEN` from the environment.
 * Not account-scoped — every account resolves the same token.
 */
export function createEnvCredentialProvider(): CredentialProvider {
  return {
    async getToken(connector) {
      const token = process.env[envKey(connector)];
      return token ? { token } : null;
    },
  };
}

/**
 * Production provider backed by Vercel Connect (`@vercel/connect`). Auth is via
 * the deployment's OIDC token (automatic on Vercel). `connector` is the
 * connector uid (e.g. "slack/acme-slack"); when the run is account-scoped the
 * token is minted for that user subject, otherwise as the app. The SDK caches
 * and auto-refreshes. Resolved via dynamic import so the package is optional.
 */
export function createVercelConnectProvider(): CredentialProvider {
  return {
    async getToken(connector, scope) {
      let connect: {
        // Real signature: connector uid is positional; returns a token string.
        getToken: (
          connectorUid: string,
          opts: {
            subject: { type: "app" } | { type: "user"; id: string };
            installationId?: string;
          },
        ) => Promise<string>;
        UserAuthorizationRequiredError?: new (...args: unknown[]) => Error;
      };
      try {
        connect = (await import("@vercel/connect")) as unknown as typeof connect;
      } catch {
        throw new Error(
          "@vercel/connect is not installed — add it to use scoped credentials",
        );
      }

      // App-subject for slack/github/discord; user-subject for oauth/* (Notion) and linear/*.
      try {
        const token = await connect.getToken(connector, {
          subject: resolveConnectTokenSubject(connector, scope),
          ...(scope.installationId
            ? { installationId: scope.installationId }
            : {}),
        });
        return token ? { token } : null;
      } catch (error) {
        // Not yet authorized → no credential (surface consent flow upstream).
        if (
          connect.UserAuthorizationRequiredError &&
          error instanceof connect.UserAuthorizationRequiredError
        ) {
          return null;
        }
        throw error;
      }
    },
  };
}

/**
 * Begin a Vercel Connect authorization for a user (the consent flow). Returns
 * a URL to redirect the end user to; after they authorize, subsequent
 * `getToken` calls for that subject succeed. Used by the consent route so
 * end users can connect their own workspaces/accounts.
 */
export interface StartConnectAuthorizationOptions {
  scopes?: string[];
  /** Where Connect returns the user after they complete the provider flow. */
  callbackUrl?: string;
}

export async function startConnectAuthorization(
  connector: string,
  scope: ConnectAuthorizationScope,
  options: StartConnectAuthorizationOptions = {},
): Promise<string> {
  if (!scope.userId) {
    throw new Error("userId is required for Connect authorization");
  }

  // Dev/local stub: skip the real provider OAuth and bounce straight back to
  // our callback with a synthetic installation id, simulating a user who just
  // authorized. Mirrors how Vercel Connect redirects to `callbackUrl` with the
  // new installation. Enable with CONNECT_STUB=1 (no @vercel/connect needed).
  if (process.env.CONNECT_STUB === "1") {
    const base = options.callbackUrl ?? "http://127.0.0.1/api/connect/callback";
    const callback = new URL(base);
    const slug = connector.replace(/[^a-zA-Z0-9]/g, "-");
    const suffix = Math.abs(
      [...`${connector}:${scope.userId}:${scope.accountId ?? ""}:${Date.now()}`].reduce(
        (acc, ch) => (acc * 31 + ch.charCodeAt(0)) | 0,
        7,
      ),
    )
      .toString(36)
      .slice(0, 6);
    callback.searchParams.set("installation_id", `stub-${slug}-${suffix}`);
    return callback.toString();
  }

  let connect: {
    startAuthorization: (
      connectorUid: string,
      params: {
        subject: { type: "app" } | { type: "user"; id: string };
        installationId?: string;
        scopes?: string[];
      },
      options?: { callbackUrl?: string },
    ) => Promise<{ url: string }>;
  };
  try {
    connect = (await import("@vercel/connect")) as unknown as typeof connect;
  } catch {
    throw new Error("@vercel/connect is not installed");
  }
  // Vercel Connect authorization UI requires a user subject; app-subject tokens
  // are minted later via getToken after the install/consent flow completes.
  const { url } = await connect.startAuthorization(
    connector,
    {
      subject: { type: "user", id: scope.userId },
      ...(scope.installationId ? { installationId: scope.installationId } : {}),
      ...(options.scopes ? { scopes: options.scopes } : {}),
    },
    options.callbackUrl ? { callbackUrl: options.callbackUrl } : undefined,
  );
  return url;
}

export interface ConnectInstallation {
  installationId?: string;
  tenantId?: string;
  name?: string;
}

/**
 * Confirm a connection and read its provider ids via `getTokenResponse`
 * (used by the connect callback after an install/authorize completes).
 */
export async function getConnectInstallation(
  connector: string,
  scope: CredentialScope,
  options: { scopes?: string[] } = {},
): Promise<ConnectInstallation | null> {
  // Dev/local stub (CONNECT_STUB=1): echo the installation id the stub
  // authorize put on the callback, with a friendly name — no real provider call.
  if (process.env.CONNECT_STUB === "1") {
    const installationId = scope.installationId ?? "stub-install";
    const provider = connector.split("/")[0] ?? connector;
    return {
      installationId,
      tenantId: installationId,
      name: `${provider} workspace (${installationId.slice(-6)})`,
    };
  }

  let connect: {
    getTokenResponse: (
      connectorUid: string,
      params: {
        subject: ConnectTokenSubject;
        installationId?: string;
      },
    ) => Promise<{
      installationId?: string;
      tenantId?: string;
      name?: string;
    }>;
  };
  try {
    connect = (await import("@vercel/connect")) as unknown as typeof connect;
  } catch {
    throw new Error("@vercel/connect is not installed");
  }
  const res = await connect.getTokenResponse(
    connector,
    {
      subject: resolveConnectCallbackSubject(connector, scope),
      ...(scope.installationId ? { installationId: scope.installationId } : {}),
      ...(options.scopes ? { scopes: options.scopes } : {}),
    },
    { forceRefresh: true },
  );
  return res
    ? {
        installationId: res.installationId,
        tenantId: res.tenantId,
        name: res.name,
      }
    : null;
}

/**
 * Pick a provider from the environment: explicit Vercel Connect opt-in
 * (`USE_VERCEL_CONNECT=1`), else the env provider if any `CONNECTOR_*_TOKEN`
 * is set, else none (external tools stay detached).
 */
export function resolveCredentialProvider(): CredentialProvider | undefined {
  if (process.env.USE_VERCEL_CONNECT === "1") {
    return createVercelConnectProvider();
  }
  const hasConnectorEnv = Object.keys(process.env).some((key) =>
    /^CONNECTOR_.+_TOKEN$/.test(key),
  );
  return hasConnectorEnv ? createEnvCredentialProvider() : undefined;
}
