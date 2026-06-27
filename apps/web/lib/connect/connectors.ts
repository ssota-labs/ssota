// Connector registry for the in-app Connectors page, backed by Composio
// toolkits. Imports ONLY the dependency-free Composio shared surface (no
// `@composio/core`) so this module can be pulled into client components
// (connectors-view.tsx) without dragging Node/DB code into the browser bundle.
import {
  COMPOSIO_TOOLKITS,
  COMPOSIO_THEME_ORDER,
  resolveComposioAuthConfigs,
} from "@ssota/agent-runtime/composio-shared";

/** Provider id == Composio toolkit slug. Open-ended (many toolkits). */
export type ConnectorProvider = string;

/** Theme groups for the connectors grid, in display order (from the registry). */
export const CONNECTOR_THEMES = COMPOSIO_THEME_ORDER;
export type ConnectorTheme = string;

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

// Curated blurbs for the common toolkits; others fall back to a generic line.
const DESCRIPTIONS: Record<string, string> = {
  slack: "Post messages, search channels, and read threads in your Slack workspace.",
  notion: "Search, read, and update pages and databases in Notion.",
  gmail: "Read, search, draft, and send email in Gmail.",
  googledrive: "Browse, search, and manage files and folders in Google Drive.",
  googlecalendar: "Read and manage events on your Google Calendar.",
  googledocs: "Create, read, and edit documents in Google Docs.",
  googlesheets: "Read and write spreadsheets in Google Sheets.",
  googletasks: "Create and track tasks in Google Tasks.",
  github: "Manage issues, pull requests, and repositories on GitHub.",
  linear: "Create and update issues and comments in Linear.",
  jira: "Track issues and sprints in Jira.",
  gitlab: "Manage merge requests, issues, and repositories in GitLab.",
  discord: "Send messages and manage channels in your Discord server.",
  outlook: "Read and send email and manage calendar in Outlook.",
  zoom: "Schedule and manage Zoom meetings.",
  googlemeet: "Create and manage Google Meet calls.",
  dropbox: "Browse and manage files in Dropbox.",
  box: "Browse and manage files in Box.",
  onedrive: "Browse and manage files in OneDrive.",
  asana: "Create and update tasks and projects in Asana.",
  trello: "Manage boards, lists, and cards in Trello.",
  clickup: "Manage tasks and docs in ClickUp.",
  todoist: "Manage tasks and projects in Todoist.",
  airtable: "Read and write records in Airtable.",
  calendly: "Manage scheduling and events in Calendly.",
  coda: "Read and edit docs and tables in Coda.",
  hubspot: "Manage contacts, deals, and companies in HubSpot.",
  salesforce: "Work with leads, opportunities, and accounts in Salesforce.",
  pipedrive: "Manage deals and contacts in Pipedrive.",
  figma: "Read files, comments, and components in Figma.",
  canva: "Create and manage designs in Canva.",
  miro: "Work with boards and items in Miro.",
  zendesk: "Manage tickets and users in Zendesk.",
  intercom: "Manage conversations and contacts in Intercom.",
  twitter: "Post, search, and engage on X (Twitter).",
  linkedin: "Share posts and manage your LinkedIn presence.",
  youtube: "Manage videos and channel data on YouTube.",
  reddit: "Read and post to Reddit.",
};

/** Resolve the connector registry from the shared Composio toolkit list. */
export function getConnectors(): ConnectorDef[] {
  // Server-only env read (this function is called from the server page). When
  // Composio is unconfigured every card renders as "not configured".
  const composioOn = Boolean(process.env.COMPOSIO_API_KEY);
  const authConfigs = resolveComposioAuthConfigs();
  return COMPOSIO_TOOLKITS.map((tk) => {
    // BYOA-only toolkits (e.g. X) can't be connected without their auth config,
    // and Composio won't even create a session for them — show as not configured.
    const usable =
      composioOn && (!tk.requiresAuthConfig || Boolean(authConfigs[tk.slug]));
    return {
      provider: tk.slug,
      label: tk.label,
      description: DESCRIPTIONS[tk.slug] ?? `Use ${tk.label} from your agent.`,
      theme: tk.theme,
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
