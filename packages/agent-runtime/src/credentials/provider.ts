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
import { connectTokenScopesForConnector } from "./mcp-scopes.js";
import { resolveEmulateSlackOAuthAuthorizeUrl } from "../connections/provider-api-base.js";

export interface CredentialScope {
  teamspaceId: string;
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

/** Connect token errors that mean "no credential right now" — not infra bugs. */
export function isRecoverableConnectTokenError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (
    error.name === "UserAuthorizationRequiredError" ||
    error.name === "NoValidTokenError" ||
    error.name === "ConnectorInstallationRequiredError"
  ) {
    return true;
  }
  const code =
    "code" in error && typeof error.code === "string" ? error.code : undefined;
  return (
    error.name === "ConnectError" &&
    (code === "unresolved_token" ||
      code === "no_token" ||
      code === "user_authorization_required" ||
      code === "connector_installation_required" ||
      code === "client_installation_required")
  );
}

export function resolveConnectTokenSubject(
  connectorUid: string,
  scope: CredentialScope,
): ConnectTokenSubject {
  const provider = connectorUid.split("/")[0] ?? connectorUid;
  // Slack MCP (https://mcp.slack.com/mcp) requires user OAuth tokens (xoxp), not
  // app/bot installation tokens. Mint user-subject when the install row has a
  // subject user (chat / per-user Connect authorize flow).
  if (provider === "slack" && scope.userId) {
    return { type: "user", id: scope.userId };
  }
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

function envSegment(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "_");
}

/**
 * Self-host / local "own-app" provider: reads connector tokens from the
 * environment. Self-hosters register their own OAuth app per connector and
 * inject its token here (e.g. a Slack bot token), instead of relying on managed
 * Vercel Connect.
 *
 * Resolution prefers an installation-scoped key, then the connector default:
 *   1. `CONNECTOR_<NAME>_<INSTALLATION>_TOKEN`  (per workspace/install)
 *   2. `CONNECTOR_<NAME>_TOKEN`                 (single-tenant default)
 *
 * `<NAME>` is the connector uid's provider segment (e.g. "slack" for "slack/acme").
 */
export function createEnvCredentialProvider(): CredentialProvider {
  return {
    async getToken(connector, scope) {
      const provider = connector.split("/")[0] ?? connector;
      if (scope?.installationId) {
        const scoped =
          process.env[
            `CONNECTOR_${envSegment(provider)}_${envSegment(scope.installationId)}_TOKEN`
          ];
        if (scoped) return { token: scoped };
      }
      const token =
        process.env[envKey(provider)] ?? process.env[envKey(connector)];
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
            scopes?: string[];
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
      // Mint with the broad provider scopes (connectTokenScopesForConnector) so the
      // resulting raw Bearer is a full workspace token. Without them Slack mints
      // an identity-only token and its MCP server lists 0 tools. The user must
      // have consented to these same scopes (see resolveAuthorizeScopes in
      // apps/web) — otherwise Connect can't carry them and getToken returns null.
      const scopes = connectTokenScopesForConnector(connector);
      try {
        const token = await connect.getToken(connector, {
          subject: resolveConnectTokenSubject(connector, scope),
          ...(scope.installationId
            ? { installationId: scope.installationId }
            : {}),
          ...(scopes && scopes.length > 0 ? { scopes } : {}),
        });
        return token ? { token } : null;
      } catch (error) {
        // Not yet authorized / token not minted → no credential (surface consent upstream).
        if (
          connect.UserAuthorizationRequiredError &&
          error instanceof connect.UserAuthorizationRequiredError
        ) {
          return null;
        }
        if (isRecoverableConnectTokenError(error)) {
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

  if (connector.startsWith("slack/")) {
    const emulateOAuth = resolveEmulateSlackOAuthAuthorizeUrl(
      options.callbackUrl ?? "http://127.0.0.1/api/connect/callback",
      options.scopes,
    );
    if (emulateOAuth) return emulateOAuth;
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

/**
 * Revoke a connector grant at Vercel Connect (the counterpart to
 * `startConnectAuthorization`). Disconnecting only removes our local link row;
 * without this the Connect-side grant survives, so the next authorize hands the
 * existing installation back **without re-prompting** — new provider scopes
 * (e.g. Slack MCP) never reach the token. Revoking forces a fresh OAuth consent
 * on reconnect.
 *
 * Best-effort: revokes every subject the install could have been minted under
 * (app + user) and swallows "already gone" / SDK-absent cases so the caller can
 * still delete the local row.
 */
export async function revokeConnectAuthorization(
  connector: string,
  scope: CredentialScope,
): Promise<void> {
  if (process.env.CONNECT_STUB === "1") return;

  let connect: {
    revokeToken: (
      connectorUid: string,
      params: { subject: ConnectTokenSubject; installationId?: string },
    ) => Promise<void>;
  };
  try {
    connect = (await import("@vercel/connect")) as unknown as typeof connect;
  } catch {
    // No managed Connect (own-app/local) — nothing to revoke upstream.
    return;
  }

  const installationId = normalizeConnectInstallationId(scope.installationId);
  let subjects: ConnectTokenSubject[];
  try {
    subjects = connectSubjectsForInstallationLookup(connector, scope);
  } catch {
    // Can't resolve a subject (e.g. user-subject connector without a userId) —
    // there's no grant we can address, so leave the local unlink to proceed.
    return;
  }
  for (const subject of subjects) {
    try {
      await connect.revokeToken(connector, {
        subject,
        ...(installationId ? { installationId } : {}),
      });
    } catch (error) {
      // Grant already revoked/expired → fine; anything else is logged but must
      // not block the local unlink the caller is about to perform.
      if (isRecoverableConnectTokenError(error)) continue;
      console.warn(
        JSON.stringify({
          component: "connect",
          phase: "revoke",
          connector,
          installationId: installationId ?? null,
          subject: subject.type,
          error: error instanceof Error ? error.message : String(error),
        }),
      );
    }
  }
}

export interface ConnectInstallation {
  installationId?: string;
  tenantId?: string;
  name?: string;
}

/** Vercel Connect may redirect with `installation_id=EMPTY` when no id is in the URL. */
const CONNECT_INSTALLATION_ID_SENTINELS = new Set([
  "",
  "empty",
  "null",
  "undefined",
]);

/**
 * Drop Connect placeholder installation/tenant ids before API calls or DB writes.
 */
export function normalizeConnectInstallationId(
  id: string | null | undefined,
): string | undefined {
  if (id == null) return undefined;
  const trimmed = id.trim();
  if (!trimmed) return undefined;
  if (CONNECT_INSTALLATION_ID_SENTINELS.has(trimmed.toLowerCase())) {
    return undefined;
  }
  return trimmed;
}

type ConnectTokenResponseShape = {
  installationId?: string;
  tenantId?: string;
  name?: string;
  metadata?: Record<string, unknown>;
};

function extractInstallationName(
  response: ConnectTokenResponseShape,
): string | undefined {
  const direct = response.name?.trim();
  if (direct) return direct;

  const metadata = response.metadata;
  if (!metadata) return undefined;

  const keys = [
    "name",
    "team_name",
    "workspace_name",
    "login",
    "organization",
    "org",
    "display_name",
    "username",
    "screen_name",
    "teamName",
    "workspaceName",
  ];
  for (const key of keys) {
    const value = metadata[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function mapConnectTokenResponse(
  response: ConnectTokenResponseShape,
): ConnectInstallation {
  return {
    installationId: normalizeConnectInstallationId(response.installationId),
    tenantId: normalizeConnectInstallationId(response.tenantId),
    name: extractInstallationName(response),
  };
}

function mergeConnectInstallations(
  ...parts: Array<ConnectInstallation | null | undefined>
): ConnectInstallation | null {
  const merged: ConnectInstallation = {};
  for (const part of parts) {
    if (!part) continue;
    if (!merged.installationId && part.installationId) {
      merged.installationId = part.installationId;
    }
    if (!merged.tenantId && part.tenantId) {
      merged.tenantId = part.tenantId;
    }
    if (!merged.name && part.name) {
      merged.name = part.name;
    }
  }
  return Object.keys(merged).length > 0 ? merged : null;
}

function connectSubjectsForInstallationLookup(
  connector: string,
  scope: CredentialScope,
): ConnectTokenSubject[] {
  const subjects: ConnectTokenSubject[] = [];
  if (connectUsesAppSubject(connector)) {
    subjects.push({ type: "app" });
  }
  subjects.push(resolveConnectCallbackSubject(connector, scope));

  const seen = new Set<string>();
  return subjects.filter((subject) => {
    const key =
      subject.type === "user" ? `user:${subject.id}` : subject.type;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
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
  const normalizedInstallationId = normalizeConnectInstallationId(
    scope.installationId,
  );
  const normalizedScope: CredentialScope = {
    ...scope,
    ...(normalizedInstallationId
      ? { installationId: normalizedInstallationId }
      : {}),
  };

  // Dev/local stub (CONNECT_STUB=1): echo the installation id the stub
  // authorize put on the callback, with a friendly name — no real provider call.
  if (process.env.CONNECT_STUB === "1") {
    const installationId = normalizedInstallationId ?? "stub-install";
    const provider = connector.split("/")[0] ?? connector;
    return {
      installationId,
      tenantId: installationId,
      name: `${provider} workspace (${installationId.slice(-6)})`,
    };
  }

  if (process.env.EMULATE_OAUTH === "1") {
    const provider = connector.split("/")[0] ?? connector;
    const installationId =
      normalizedInstallationId ??
      `emulate-${provider}-${scope.userId ?? "anon"}`;
    const installation: ConnectInstallation = {
      installationId,
      tenantId: installationId,
    };
    const { enrichConnectInstallationDisplay } = await import(
      "../connections/enrich-installation-display.js"
    );
    return enrichConnectInstallationDisplay({
      connector,
      installation,
      scope: normalizedScope,
    });
  }

  let connect: {
    getTokenResponse: (
      connectorUid: string,
      params: {
        subject: ConnectTokenSubject;
        installationId?: string;
        scopes?: string[];
      },
      options?: { forceRefresh?: boolean; vercelToken?: string },
    ) => Promise<ConnectTokenResponseShape>;
  };
  try {
    connect = (await import("@vercel/connect")) as unknown as typeof connect;
  } catch {
    throw new Error("@vercel/connect is not installed");
  }

  const tokenParams = {
    ...(normalizedInstallationId
      ? { installationId: normalizedInstallationId }
      : {}),
    ...(options.scopes ? { scopes: options.scopes } : {}),
  };

  const installations: ConnectInstallation[] = [];
  for (const subject of connectSubjectsForInstallationLookup(
    connector,
    normalizedScope,
  )) {
    try {
      const response = await connect.getTokenResponse(
        connector,
        { subject, ...tokenParams },
        { forceRefresh: true },
      );
      if (response) {
        installations.push(mapConnectTokenResponse(response));
      }
    } catch {
      // App-subject lookup can fail before install completes; user-subject may still work.
    }
  }

  const merged = mergeConnectInstallations(...installations);
  if (merged) return merged;

  // A token response succeeded but carried no installation metadata (no
  // installationId / tenantId / name). This is normal for user-subject MCP
  // grants such as Notion's hosted MCP (mcp.notion.com), where the grant is
  // keyed by the Connect user subject and there is no provider "installation"
  // id to surface. Return a non-null marker so the connect callback records the
  // connection instead of mistaking a valid grant for "not connected" — the
  // failure mode where consent completes but no row is ever written.
  return installations.length > 0 ? {} : null;
}

/**
 * Pick a credential provider. `CREDENTIALS` selects explicitly (the open-core
 * boundary); otherwise it auto-detects for back-compat:
 *
 *  - `CREDENTIALS=own-app` (OSS): env-token provider (`CONNECTOR_*_TOKEN`).
 *  - `CREDENTIALS=connect` (Enterprise): managed Vercel Connect.
 *  - `CREDENTIALS=none`: no provider (external tools stay detached).
 *  - unset: Vercel Connect if `USE_VERCEL_CONNECT=1`, else own-app if any
 *    `CONNECTOR_*_TOKEN` is set, else none.
 */
export function resolveCredentialProvider(): CredentialProvider | undefined {
  switch (process.env.CREDENTIALS) {
    case "own-app":
      return createEnvCredentialProvider();
    case "connect":
      return createVercelConnectProvider();
    case "none":
      return undefined;
  }

  if (process.env.USE_VERCEL_CONNECT === "1") {
    return createVercelConnectProvider();
  }
  const hasConnectorEnv = Object.keys(process.env).some((key) =>
    /^CONNECTOR_.+_TOKEN$/.test(key),
  );
  return hasConnectorEnv ? createEnvCredentialProvider() : undefined;
}
