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
  /** Theme group the card is bucketed under (see {@link COMPOSIO_THEME_ORDER}). */
  theme: string;
  /** Optional display grouping (e.g. the three Google toolkits). */
  group?: string;
  /** Whether the card hints multiple accounts can be connected (cosmetic). */
  multiWorkspace: boolean;
  /**
   * Toolkit Composio cannot auto-create a managed auth config for — it MUST be
   * BYOA (e.g. X/twitter needs your own OAuth app + paid API tier). Such a
   * toolkit is excluded from sessions unless `COMPOSIO_AUTHCONFIG_<SLUG>` is set,
   * so it can't 400 the whole Tool Router session.
   */
  requiresAuthConfig?: boolean;
}

/** Theme groups, in display order. */
export const COMPOSIO_THEME_ORDER = [
  "Productivity",
  "Communication",
  "Developer",
  "Storage",
  "CRM & Sales",
  "Design",
  "Support",
  "Social",
] as const;

/**
 * Toolkits the agent + Connectors page expose. Slugs are Composio's canonical
 * toolkit ids — verify against the catalog (composio.dev/toolkits) if a connect
 * call 404s. Most use Composio-managed auth (no BYOA needed); a toolkit that
 * can't be managed (X) is flagged `requiresAuthConfig`. The Tool Router session
 * is resilient — any toolkit Composio can't auto-create is dropped at runtime,
 * so listing extras here is safe.
 */
export const COMPOSIO_TOOLKITS: ComposioToolkitDef[] = [
  // Productivity
  { slug: "notion", label: "Notion", theme: "Productivity", multiWorkspace: true },
  { slug: "gmail", label: "Gmail", theme: "Productivity", group: "google", multiWorkspace: true },
  { slug: "googlecalendar", label: "Google Calendar", theme: "Productivity", group: "google", multiWorkspace: true },
  { slug: "googledocs", label: "Google Docs", theme: "Productivity", group: "google", multiWorkspace: true },
  { slug: "googlesheets", label: "Google Sheets", theme: "Productivity", group: "google", multiWorkspace: true },
  { slug: "googletasks", label: "Google Tasks", theme: "Productivity", group: "google", multiWorkspace: true },
  { slug: "asana", label: "Asana", theme: "Productivity", multiWorkspace: true },
  { slug: "trello", label: "Trello", theme: "Productivity", multiWorkspace: true },
  { slug: "clickup", label: "ClickUp", theme: "Productivity", multiWorkspace: true },
  { slug: "todoist", label: "Todoist", theme: "Productivity", multiWorkspace: true },
  { slug: "airtable", label: "Airtable", theme: "Productivity", multiWorkspace: true },
  { slug: "calendly", label: "Calendly", theme: "Productivity", multiWorkspace: true },
  { slug: "coda", label: "Coda", theme: "Productivity", multiWorkspace: true },
  // Communication
  { slug: "slack", label: "Slack", theme: "Communication", multiWorkspace: true },
  { slug: "discord", label: "Discord", theme: "Communication", multiWorkspace: true },
  { slug: "outlook", label: "Outlook", theme: "Communication", multiWorkspace: true },
  { slug: "googlemeet", label: "Google Meet", theme: "Communication", group: "google", multiWorkspace: true },
  { slug: "zoom", label: "Zoom", theme: "Communication", multiWorkspace: true },
  // Developer
  { slug: "github", label: "GitHub", theme: "Developer", multiWorkspace: true },
  { slug: "linear", label: "Linear", theme: "Developer", multiWorkspace: false },
  { slug: "jira", label: "Jira", theme: "Developer", multiWorkspace: true },
  { slug: "gitlab", label: "GitLab", theme: "Developer", multiWorkspace: true },
  { slug: "sentry", label: "Sentry", theme: "Developer", multiWorkspace: true },
  // Storage
  { slug: "googledrive", label: "Google Drive", theme: "Storage", group: "google", multiWorkspace: true },
  { slug: "dropbox", label: "Dropbox", theme: "Storage", multiWorkspace: true },
  { slug: "box", label: "Box", theme: "Storage", multiWorkspace: true },
  { slug: "onedrive", label: "OneDrive", theme: "Storage", multiWorkspace: true },
  // CRM & Sales
  { slug: "hubspot", label: "HubSpot", theme: "CRM & Sales", multiWorkspace: true },
  { slug: "salesforce", label: "Salesforce", theme: "CRM & Sales", multiWorkspace: true },
  { slug: "pipedrive", label: "Pipedrive", theme: "CRM & Sales", multiWorkspace: true },
  // Design
  { slug: "figma", label: "Figma", theme: "Design", multiWorkspace: true },
  { slug: "canva", label: "Canva", theme: "Design", multiWorkspace: true },
  { slug: "miro", label: "Miro", theme: "Design", multiWorkspace: true },
  // Support
  { slug: "zendesk", label: "Zendesk", theme: "Support", multiWorkspace: true },
  { slug: "intercom", label: "Intercom", theme: "Support", multiWorkspace: true },
  // Social
  {
    slug: "twitter",
    label: "X",
    theme: "Social",
    multiWorkspace: false,
    requiresAuthConfig: true,
  },
  { slug: "linkedin", label: "LinkedIn", theme: "Social", multiWorkspace: true },
  { slug: "youtube", label: "YouTube", theme: "Social", multiWorkspace: true },
  { slug: "reddit", label: "Reddit", theme: "Social", multiWorkspace: true },
];

export function getComposioToolkitSlugs(): string[] {
  return COMPOSIO_TOOLKITS.map((t) => t.slug);
}

/**
 * Toolkit slugs safe to put in a Tool Router session: every toolkit except
 * BYOA-only ones (`requiresAuthConfig`) that have no `COMPOSIO_AUTHCONFIG_<SLUG>`
 * configured. Composio fails session creation (400) for a BYOA-only toolkit with
 * no auth config, so excluding it lets the rest of the session work.
 *
 * Server-only (reads env via {@link resolveComposioAuthConfigs}).
 */
export function getSessionToolkitSlugs(): string[] {
  const authConfigs = resolveComposioAuthConfigs();
  return COMPOSIO_TOOLKITS.filter(
    (t) => !t.requiresAuthConfig || Boolean(authConfigs[t.slug]),
  ).map((t) => t.slug);
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
