// Connector registry for the in-app Connectors page, backed by Composio
// toolkits. Imports ONLY the dependency-free Composio shared surface (no
// `@composio/core`) so this module can be pulled into client components
// (connectors-view.tsx) without dragging Node/DB code into the browser bundle.
import {
  COMPOSIO_TOOLKITS,
  resolveComposioAuthConfigs,
} from "@ssota/agent-runtime/composio-shared";

/** Provider id == Composio toolkit slug. */
export type ConnectorProvider =
  | "slack"
  | "notion"
  | "gmail"
  | "googledrive"
  | "googlecalendar"
  | "googledocs"
  | "googlesheets"
  | "github"
  | "linear"
  | "discord"
  | "twitter";

/** Theme groups for the connectors grid, in display order. */
export const CONNECTOR_THEMES = [
  "Productivity",
  "Communication",
  "Developer",
  "Storage",
  "Social",
] as const;
export type ConnectorTheme = (typeof CONNECTOR_THEMES)[number];

const THEMES: Record<ConnectorProvider, ConnectorTheme> = {
  notion: "Productivity",
  gmail: "Productivity",
  googlecalendar: "Productivity",
  googledocs: "Productivity",
  googlesheets: "Productivity",
  slack: "Communication",
  discord: "Communication",
  github: "Developer",
  linear: "Developer",
  googledrive: "Storage",
  twitter: "Social",
};

export interface ConnectorDef {
  /** Composio toolkit slug (also the value passed to /api/connect/authorize). */
  provider: ConnectorProvider;
  label: string;
  /** Short, user-facing blurb shown on the card. */
  description: string;
  /** Theme group label the card is bucketed under. */
  theme: ConnectorTheme;
  /** Cosmetic: hints multiple accounts can be connected. */
  multiWorkspace: boolean;
  /**
   * The id the Connections card connects/disconnects. With Composio this is the
   * toolkit slug, present when Composio is configured for the deployment, else
   * null (card shows "not configured"). Kept as a field so the existing card UI
   * keeps working unchanged.
   */
  connectorUid: string | null;
  /**
   * Retained for the connections UI's MCP-vs-API branch. Composio unifies both
   * behind one Tool Router session, so this is always false now.
   */
  isMcp: boolean;
}

const DESCRIPTIONS: Record<ConnectorProvider, string> = {
  slack: "Post messages, search channels, and read threads in your Slack workspace.",
  notion: "Search, read, and update pages and databases in Notion.",
  gmail: "Read, search, draft, and send email in Gmail.",
  googledrive: "Browse, search, and manage files and folders in Google Drive.",
  googlecalendar: "Read and manage events on your Google Calendar.",
  googledocs: "Create, read, and edit documents in Google Docs.",
  googlesheets: "Read and write spreadsheets in Google Sheets.",
  github: "Manage issues, pull requests, and repositories on GitHub.",
  linear: "Create and update issues and comments in Linear.",
  discord: "Send messages and manage channels in your Discord server.",
  twitter: "Post, search, and engage on X (Twitter).",
};

/** Resolve the connector registry from the shared Composio toolkit list. */
export function getConnectors(): ConnectorDef[] {
  // Server-only env read (this function is called from the server page). When
  // Composio is unconfigured every card renders as "not configured".
  const composioOn = Boolean(process.env.COMPOSIO_API_KEY);
  const authConfigs = resolveComposioAuthConfigs();
  return COMPOSIO_TOOLKITS.map((tk) => {
    const provider = tk.slug as ConnectorProvider;
    // BYOA-only toolkits (e.g. X) can't be connected without their auth config,
    // and Composio won't even create a session for them — show as not configured.
    const usable =
      composioOn && (!tk.requiresAuthConfig || Boolean(authConfigs[tk.slug]));
    return {
      provider,
      label: tk.label,
      description: DESCRIPTIONS[provider] ?? tk.label,
      theme: THEMES[provider] ?? "Productivity",
      multiWorkspace: tk.multiWorkspace,
      connectorUid: usable ? tk.slug : null,
      isMcp: false,
    };
  });
}

/** Provider segment of a connector value. For Composio this is the slug itself. */
export function providerOf(connector: string): string {
  return connector.split("/")[0] ?? connector;
}
