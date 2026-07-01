import type { OrgRouteContext } from "./paths";
import { orgPath } from "./paths";
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

/** Runtime + context definition surfaces — fixed order in the builder sidebar. */
export const L0_NAV: NavEntry[] = [
  { type: "link", key: "chat", labelKey: "nav.chat", href: "c", pattern: "L" },
  { type: "link", key: "tasks", labelKey: "nav.tasks", href: "tasks", pattern: "L" },
  {
    type: "link",
    key: "agents",
    labelKey: "nav.agents",
    href: "agents",
    pattern: "L",
  },
  {
    type: "link",
    key: "skills",
    labelKey: "nav.skills",
    href: "skills",
    pattern: "L",
  },
  { type: "link", key: "graph", labelKey: "nav.graph", href: "graph", pattern: "L" },
  {
    type: "link",
    key: "connectors",
    labelKey: "nav.connections",
    href: "connectors",
    pattern: "L",
  },
  {
    type: "link",
    key: "channels",
    labelKey: "nav.channels",
    href: "channels",
    pattern: "L",
  },
  {
    type: "link",
    key: "schedules",
    labelKey: "nav.schedules",
    href: "schedules",
    pattern: "L",
  },
  {
    type: "link",
    key: "sandbox",
    labelKey: "nav.sandbox",
    href: "sandbox",
    pattern: "L",
  },
  {
    type: "link",
    key: "templates",
    labelKey: "nav.templates",
    href: "templates",
    pattern: "L",
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
  if (relative === "connectors" || relative.startsWith("connectors/")) {
    return [{ labelKey: "nav.connections" }];
  }
  if (relative === "schedules" || relative.startsWith("schedules/")) {
    return [{ labelKey: "nav.schedules" }];
  }
  if (relative === "agents" || relative.startsWith("agents/")) {
    return [{ labelKey: "nav.agents" }];
  }
  if (relative === "skills" || relative.startsWith("skills/")) {
    return [{ labelKey: "nav.skills" }];
  }
  if (relative === "graph" || relative.startsWith("graph/")) {
    return [{ labelKey: "nav.graph" }];
  }
  if (relative === "channels" || relative.startsWith("channels/")) {
    return [{ labelKey: "nav.channels" }];
  }
  if (relative === "sandbox" || relative.startsWith("sandbox/")) {
    return [{ labelKey: "nav.sandbox" }];
  }
  if (relative === "templates" || relative.startsWith("templates/")) {
    return [{ labelKey: "nav.templates" }];
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
