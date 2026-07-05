export type AgentsNavItem = {
  key: string;
  labelKey: string;
  href: string;
  iconKey: string;
  /** When true, the page shows a coming-soon placeholder instead of full UI. */
  comingSoon?: boolean;
};

/** L1 sidebar items under Agents (Settings-style drill-in). */
export const AGENTS_NAV: AgentsNavItem[] = [
  {
    key: "agents",
    labelKey: "nav.agents",
    href: "agents",
    iconKey: "agents",
  },
  {
    key: "skills",
    labelKey: "nav.skills",
    href: "skills",
    iconKey: "skills",
  },
  {
    key: "workers",
    labelKey: "nav.workers",
    href: "workers",
    iconKey: "workers",
  },
  {
    key: "sandbox",
    labelKey: "nav.sandbox",
    href: "sandbox",
    iconKey: "sandbox",
  },
  {
    key: "channels",
    labelKey: "nav.channels",
    href: "channels",
    iconKey: "channels",
  },
  {
    key: "connections",
    labelKey: "nav.connections",
    href: "connections",
    iconKey: "connections",
  },
  {
    key: "subagents",
    labelKey: "nav.subagents",
    href: "subagents",
    iconKey: "subagents",
    comingSoon: true,
  },
  {
    key: "schedules",
    labelKey: "nav.schedules",
    href: "schedules",
    iconKey: "schedules",
  },
];

const AGENTS_ROUTE_PREFIXES = AGENTS_NAV.map((item) => item.href);

const SECTION_LABEL_KEYS: Record<string, string> = Object.fromEntries(
  AGENTS_NAV.map((item) => [item.key, item.labelKey]),
);

export function isAgentsRoute(relativePath: string): boolean {
  const first = relativePath.split("/")[0] ?? "";
  return AGENTS_ROUTE_PREFIXES.includes(first);
}

export function getAgentsSectionLabelKey(relativePath: string): string | null {
  const section = relativePath.split("/")[0];
  if (!section) return "nav.agents";
  return SECTION_LABEL_KEYS[section] ?? null;
}
