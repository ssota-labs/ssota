/**
 * Composio shared, dependency-free surface. Imported by BOTH the Node runtime
 * (session/tools) and the web client (connections UI), so this module must NOT
 * import `@composio/core` or any Node-only/DB code — keep it pure data +
 * `process.env` reads that only run when the resolver is called server-side.
 *
 * Tenancy: the Composio entity (`userId`) is keyed by org + profile so
 * connections are SHARED across a user's projects within one org and ISOLATED
 * across orgs. Never key by profile id alone — that would collapse orgs.
 */

/** Composio entity id. Same function MUST be used by web + runtime (key drift = lost connections). */
export function composioUserId(input: { orgId: string; profileId: string }): string {
  return `org_${input.orgId}__user_${input.profileId}`;
}

/**
 * Org-shared Composio entity. Connections created under this entity as
 * `accountType: SHARED` (with an ACL of the org's member user entities) are
 * usable by every member's personal session — the basis of the "Organization"
 * connection scope.
 */
export function composioOrgUserId(orgId: string): string {
  return `org_${orgId}`;
}

/** Connection scope shown in the Connectors sheet accordion. */
export type ConnectorScope = "user" | "org";

export interface ComposioToolkitDef {
  /** Composio toolkit slug (lowercase), passed to toolRouter `toolkits`. */
  slug: string;
  /** UI label for the Connections card. */
  label: string;
  /** Optional display grouping (e.g. the three Google toolkits). */
  group?: string;
  /** Whether the card hints multiple accounts can be connected (cosmetic). */
  multiWorkspace: boolean;
}

/**
 * Toolkits the agent + Connections page expose. Slugs are Composio's canonical
 * toolkit ids — verify against the catalog (composio.dev/toolkits) if a connect
 * call 404s. Google is three separate Composio toolkits (each its own OAuth),
 * grouped under "google" for the UI.
 */
export const COMPOSIO_TOOLKITS: ComposioToolkitDef[] = [
  { slug: "slack", label: "Slack", multiWorkspace: true },
  { slug: "notion", label: "Notion", multiWorkspace: true },
  { slug: "gmail", label: "Gmail", group: "google", multiWorkspace: true },
  { slug: "googledrive", label: "Google Drive", group: "google", multiWorkspace: true },
  { slug: "googlecalendar", label: "Google Calendar", group: "google", multiWorkspace: true },
  { slug: "github", label: "GitHub", multiWorkspace: true },
  { slug: "linear", label: "Linear", multiWorkspace: false },
  { slug: "twitter", label: "X", multiWorkspace: false },
];

export function getComposioToolkitSlugs(): string[] {
  return COMPOSIO_TOOLKITS.map((t) => t.slug);
}

export function isComposioToolkit(slug: string): boolean {
  return COMPOSIO_TOOLKITS.some((t) => t.slug === slug);
}

const authConfigEnvKey = (slug: string): string =>
  `COMPOSIO_AUTHCONFIG_${slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;

/**
 * Per-toolkit auth config ids (BYOA / custom). A toolkit with
 * `COMPOSIO_AUTHCONFIG_<SLUG>` set uses that auth config (our own OAuth app);
 * a toolkit without one falls back to Composio's default managed auth. This is
 * what lets managed and bring-your-own-auth coexist per toolkit.
 *
 * Server-only — relies on non-public env. Do not call during client render.
 */
export function resolveComposioAuthConfigs(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const tk of COMPOSIO_TOOLKITS) {
    const id = process.env[authConfigEnvKey(tk.slug)];
    if (id) out[tk.slug] = id;
  }
  return out;
}
