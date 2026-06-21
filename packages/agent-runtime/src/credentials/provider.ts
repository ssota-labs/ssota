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

      // Act as the app/bot; address the tenant's installation by account
      // (multi-tenant connectors like Slack/GitHub). Builders can remap.
      try {
        const token = await connect.getToken(connector, {
          subject: { type: "app" },
          ...(scope.accountId ? { installationId: scope.accountId } : {}),
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
export async function startConnectAuthorization(
  connector: string,
  scope: CredentialScope,
  scopes?: string[],
): Promise<string> {
  let connect: {
    startAuthorization: (
      connectorUid: string,
      opts: {
        subject: { type: "app" } | { type: "user"; id: string };
        scopes?: string[];
      },
    ) => Promise<{ url: string }>;
  };
  try {
    connect = (await import("@vercel/connect")) as unknown as typeof connect;
  } catch {
    throw new Error("@vercel/connect is not installed");
  }
  const subject = scope.accountId
    ? ({ type: "user", id: scope.accountId } as const)
    : ({ type: "app" } as const);
  const { url } = await connect.startAuthorization(connector, {
    subject,
    ...(scopes ? { scopes } : {}),
  });
  return url;
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
