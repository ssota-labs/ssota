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
 * Production provider backed by Vercel Connect. The Connect SDK is resolved at
 * call time and keyed by project + account installation. Throws if the SDK is
 * not installed — wire `@vercel/connect` and replace the resolution below.
 */
export function createVercelConnectProvider(): CredentialProvider {
  return {
    async getToken(connector, scope) {
      let connect: { getToken: (opts: unknown) => Promise<{ token: string; expiresAt?: string }> };
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        connect = (await import("@vercel/connect" as any)) as never;
      } catch {
        throw new Error(
          "@vercel/connect is not installed — add it to use scoped credentials",
        );
      }
      const result = await connect.getToken({
        connector,
        project: scope.projectId,
        installation: scope.accountId,
      });
      return result ? { token: result.token, expiresAt: result.expiresAt } : null;
    },
  };
}
