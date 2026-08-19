import type { OrgRouteContext } from "./paths";
import { orgPath } from "./paths";
import { getAgentsSectionLabelKey, isAgentsRoute } from "./agents-navigation";
import { getSettingsSectionLabelKey } from "../settings/navigation";

export type PagePatternCode = "H" | "D" | "L" | "T" | "canvas";

export type NavScope = "project" | "evergreen" | "initiative";

export type NavSeparator = { type: "separator" };

export type NavLink = {
  type: "link";
  key: string;
  labelKey: string;
  href: string;
  pattern?: PagePatternCode;
};

export type NavGroup = {
  type: "group";
  key: string;
  labelKey: string;
  children: NavLink[];
};

export type NavSectionChild = NavLink | NavGroup;

export type NavSection = {
  type: "section";
  key: string;
  labelKey: string;
  children: NavSectionChild[];
};

export type NavEntry = NavSeparator | NavLink | NavGroup | NavSection;

/** Top-level builder sidebar links (Agents opens L1 slide-in, like Settings). */
export const L0_NAV: NavEntry[] = [
  { type: "link", key: "chat", labelKey: "nav.chat", href: "c", pattern: "L" },
  { type: "link", key: "tasks", labelKey: "nav.tasks", href: "tasks", pattern: "L" },
  { type: "link", key: "agents", labelKey: "nav.agents", href: "agents", pattern: "L" },
  { type: "link", key: "graph", labelKey: "nav.graph", href: "graph", pattern: "L" },
  { type: "link", key: "ontology", labelKey: "nav.ontology", href: "ontology", pattern: "L" },
  { type: "link", key: "data", labelKey: "nav.data", href: "data", pattern: "T" },
];

export type L0GroupKey = "executive" | "research" | "manager" | "development" | "design";

export function getRelativeProjectPath(pathname: string, projectBase: string): string {
  return pathname.startsWith(projectBase)
    ? pathname.slice(projectBase.length).replace(/^\//, "")
    : pathname.replace(/^\//, "");
}

/**
 * Initial expanded-group state for the static L0 nav. L0 no longer has
 * collapsible groups (the per-stage workflow nav is now the page tree), so this
 * is empty; kept for the AppSidebar group-expansion plumbing.
 */
export function getExpandedGroupsFromPath(
  _relativePath: string,
): Record<string, boolean> {
  return {};
}

export function resolveNavHref(ctx: OrgRouteContext, href: string): string {
  if (!href) return orgPath(ctx);
  return orgPath(ctx, ...href.split("/"));
}

export function isNavLinkActive(
  pathname: string,
  projectBase: string,
  href: string,
): boolean {
  const fullPath = href ? `${projectBase}/${href}` : projectBase;
  return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
}

export type BreadcrumbSegment = {
  labelKey: string;
  href?: string;
};

export function buildBreadcrumbSegments(
  pathname: string,
  projectBase: string,
): BreadcrumbSegment[] {
  const relative = getRelativeProjectPath(pathname, projectBase);

  if (!relative || relative === "overview") {
    return [{ labelKey: "nav.home" }];
  }
  if (relative === "tasks" || relative.startsWith("tasks/")) {
    return [{ labelKey: "nav.tasks" }];
  }
  if (relative === "c" || relative.startsWith("c/")) {
    return [{ labelKey: "nav.chat" }];
  }
  if (relative === "graph" || relative.startsWith("graph/")) {
    return [{ labelKey: "nav.graph" }];
  }
  if (relative === "ontology" || relative.startsWith("ontology/")) {
    return [{ labelKey: "nav.ontology" }];
  }
  if (relative === "data" || relative.startsWith("data/")) {
    return [{ labelKey: "nav.data" }];
  }
  if (relative === "workflows" || relative.startsWith("workflows/")) {
    return [{ labelKey: "nav.workflows" }];
  }
  if (isAgentsRoute(relative)) {
    const sectionKey = getAgentsSectionLabelKey(relative);
    if (sectionKey && sectionKey !== "nav.agents") {
      return [
        { labelKey: "nav.agents", href: "agents" },
        { labelKey: sectionKey },
      ];
    }
    return [{ labelKey: "nav.agents" }];
  }
  if (relative === "workers" || relative.startsWith("workers/")) {
    return [
      { labelKey: "nav.agents", href: "agents" },
      { labelKey: "nav.workers" },
    ];
  }
  if (relative === "tools" || relative.startsWith("tools/")) {
    return [
      { labelKey: "nav.agents", href: "agents" },
      { labelKey: "nav.workers" },
    ];
  }
  if (relative === "templates" || relative.startsWith("templates/")) {
    return [
      { labelKey: "nav.agents", href: "agents" },
      { labelKey: "nav.templates" },
    ];
  }
  if (
    relative === "design/ui-components" ||
    relative.startsWith("design/ui-components/")
  ) {
    return [
      { labelKey: "nav.productDesign" },
      { labelKey: "nav.designUiComponents" },
    ];
  }
  if (relative.startsWith("developer/")) {
    return [
      { labelKey: "nav.settings", href: "settings/general" },
      { labelKey: "settings.developer" },
    ];
  }
  if (relative.startsWith("settings/")) {
    const sectionKey = getSettingsSectionLabelKey(relative);
    if (sectionKey && sectionKey !== "settings.general") {
      return [
        { labelKey: "nav.settings", href: "settings/general" },
        { labelKey: sectionKey },
      ];
    }
    return [{ labelKey: "nav.settings" }];
  }

  return [{ labelKey: "nav.home" }];
}
