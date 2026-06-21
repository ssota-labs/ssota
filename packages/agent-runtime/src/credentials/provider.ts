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
        getToken: (params: {
          connector: string;
          subject: { type: "app" } | { type: "user"; id: string };
        }) => Promise<{ token: string; expiresAt?: string } | null>;
      };
      try {
        connect = (await import("@vercel/connect")) as unknown as typeof connect;
      } catch {
        throw new Error(
          "@vercel/connect is not installed — add it to use scoped credentials",
        );
      }
      const subject = scope.accountId
        ? ({ type: "user", id: scope.accountId } as const)
        : ({ type: "app" } as const);
      const result = await connect.getToken({ connector, subject });
      return result
        ? { token: result.token, expiresAt: result.expiresAt }
        : null;
    },
  };
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
