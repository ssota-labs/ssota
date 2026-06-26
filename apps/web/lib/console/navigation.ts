import type { ProjectRouteContext } from "./paths";
import { projectPath } from "./paths";

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


export const L0_NAV: NavEntry[] = [
  {
    type: "link",
    key: "home",
    labelKey: "nav.home",
    href: "overview",
    pattern: "H",
  },
  { type: "link", key: "tasks", labelKey: "nav.tasks", href: "tasks", pattern: "L" },
  {
    type: "link",
    key: "workflow_instructions",
    labelKey: "nav.workflowInstructions",
    href: "workflow/instructions",
    pattern: "L",
  },
  { type: "link", key: "chat", labelKey: "nav.chat", href: "c", pattern: "L" },
  {
    type: "link",
    key: "connections",
    labelKey: "nav.connections",
    href: "connectors",
    pattern: "L",
  },
  // The per-stage workflow nav (Executive/Research/Manager/Development/Design)
  // is now the Notion-style page tree (PageTreeNav, fed by the pages table), not
  // a static section here. L0 keeps only the always-on top links + Explore.
  {
    type: "section",
    key: "l0_explore",
    labelKey: "nav.sectionExplore",
    children: [
      {
        type: "link",
        key: "workflow_map",
        labelKey: "nav.workflowMap",
        href: "workflow/map",
        pattern: "canvas",
      },
    ],
  },
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

export function resolveNavHref(ctx: ProjectRouteContext, href: string): string {
  if (!href) return projectPath(ctx);
  return projectPath(ctx, ...href.split("/"));
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
  if (relative === "connectors" || relative.startsWith("connectors/")) {
    return [{ labelKey: "nav.connections" }];
  }
  if (relative === "workflow/map") {
    return [{ labelKey: "nav.workflowMap" }];
  }
  if (relative === "workflow/instructions") {
    return [{ labelKey: "nav.workflowInstructions" }];
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
    return [{ labelKey: "nav.developer" }];
  }
  if (relative.startsWith("settings/")) {
    return [{ labelKey: "nav.settings" }];
  }

  return [{ labelKey: "nav.home" }];
}
