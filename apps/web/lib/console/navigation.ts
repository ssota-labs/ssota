import type { ProjectRouteContext } from "./paths";
import { projectPath } from "./paths";

export type PagePatternCode = "H" | "D" | "L" | "T" | "canvas";

export type NavScope = "project" | "evergreen" | "initiative";

export type SidebarMode = "l0" | "l1";

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

export const EXECUTIVE_L1: NavLink[] = [
  {
    type: "link",
    key: "executive_roadmap",
    labelKey: "nav.executiveRoadmap",
    href: "executive/roadmap",
    pattern: "D",
  },
  {
    type: "link",
    key: "executive_goals",
    labelKey: "nav.executiveGoals",
    href: "executive/goals",
    pattern: "L",
  },
];

export const RESEARCH_L1: NavLink[] = [
  {
    type: "link",
    key: "research_market",
    labelKey: "nav.researchMarket",
    href: "research/market",
    pattern: "L",
  },
  {
    type: "link",
    key: "research_user",
    labelKey: "nav.researchUser",
    href: "research/user",
    pattern: "L",
  },
  {
    type: "link",
    key: "research_hypotheses",
    labelKey: "nav.researchHypotheses",
    href: "research/hypotheses",
    pattern: "L",
  },
];

export const MANAGER_L1: NavLink[] = [
  {
    type: "link",
    key: "manager_initiatives",
    labelKey: "nav.productInitiatives",
    href: "initiatives",
    pattern: "L",
  },
];

/** Route prefixes that auto-expand the Manager L0 group. */
export const MANAGER_ROUTE_PREFIXES = ["initiatives"] as const;

export const DEVELOPMENT_L1: NavLink[] = [
  {
    type: "link",
    key: "dev_data_model",
    labelKey: "nav.devDataModel",
    href: "development/data-model",
    pattern: "D",
  },
  {
    type: "link",
    key: "dev_system_model",
    labelKey: "nav.devSystemModel",
    href: "development/system-model",
    pattern: "D",
  },
  {
    type: "link",
    key: "dev_api_reference",
    labelKey: "nav.devApiReference",
    href: "development/api-reference",
    pattern: "D",
  },
  {
    type: "link",
    key: "dev_integration",
    labelKey: "nav.devIntegration",
    href: "development/integration",
    pattern: "D",
  },
];

export const DESIGN_L1: NavLink[] = [
  {
    type: "link",
    key: "design_ia",
    labelKey: "nav.designIa",
    href: "design/ia",
    pattern: "T",
  },
  {
    type: "link",
    key: "design_ui_components",
    labelKey: "nav.designUiComponents",
    href: "design/ui-components",
    pattern: "L",
  },
  {
    type: "link",
    key: "design_theme",
    labelKey: "nav.designTheme",
    href: "design/design-theme",
    pattern: "D",
  },
  {
    type: "link",
    key: "design_toolchain",
    labelKey: "nav.designToolchain",
    href: "design/design-toolchain",
    pattern: "D",
  },
];

export const INITIATIVE_L1_NAV: NavEntry[] = [
  {
    type: "link",
    key: "initiative_overview",
    labelKey: "nav.initiativeOverview",
    href: "",
    pattern: "H",
  },
  {
    type: "section",
    key: "initiative_planning",
    labelKey: "nav.initiativePlanning",
    children: [
      {
        type: "link",
        key: "planning_prd",
        labelKey: "nav.planningPrd",
        href: "planning/prd",
        pattern: "D",
      },
      {
        type: "link",
        key: "planning_features",
        labelKey: "nav.planningFeatures",
        href: "planning/features",
        pattern: "L",
      },
      {
        type: "link",
        key: "planning_stories",
        labelKey: "nav.planningStories",
        href: "planning/stories",
        pattern: "L",
      },
    ],
  },
  {
    type: "section",
    key: "initiative_design",
    labelKey: "nav.initiativeDesign",
    children: [
      {
        type: "link",
        key: "initiative_design_ia",
        labelKey: "nav.initiativeDesignIa",
        href: "design/ia",
        pattern: "T",
      },
      {
        type: "link",
        key: "design_wireframes",
        labelKey: "nav.designWireframes",
        href: "design/wireframes",
        pattern: "L",
      },
      {
        type: "link",
        key: "design_flows",
        labelKey: "nav.designFlows",
        href: "design/flows",
        pattern: "D",
      },
    ],
  },
  {
    type: "section",
    key: "initiative_architecture",
    labelKey: "nav.initiativeArchitecture",
    children: [
      {
        type: "link",
        key: "architecture_spec",
        labelKey: "nav.architectureSpec",
        href: "architecture/spec",
        pattern: "D",
      },
      {
        type: "link",
        key: "architecture_data",
        labelKey: "nav.architectureData",
        href: "architecture/data",
        pattern: "D",
      },
      {
        type: "link",
        key: "architecture_integration",
        labelKey: "nav.architectureIntegration",
        href: "architecture/integration",
        pattern: "D",
      },
    ],
  },
  {
    type: "section",
    key: "initiative_build",
    labelKey: "nav.initiativeBuild",
    children: [
      {
        type: "link",
        key: "build_plan",
        labelKey: "nav.buildPlan",
        href: "build/plan",
        pattern: "D",
      },
      {
        type: "link",
        key: "build_tasks",
        labelKey: "nav.buildTasks",
        href: "build/tasks",
        pattern: "L",
      },
      {
        type: "link",
        key: "build_pull_requests",
        labelKey: "nav.buildPullRequests",
        href: "build/pull-requests",
        pattern: "L",
      },
    ],
  },
  {
    type: "section",
    key: "initiative_qa",
    labelKey: "nav.initiativeQa",
    children: [
      {
        type: "link",
        key: "qa_test_plan",
        labelKey: "nav.qaTestPlan",
        href: "qa/test-plan",
        pattern: "D",
      },
    ],
  },
  {
    type: "section",
    key: "initiative_launch",
    labelKey: "nav.initiativeLaunch",
    children: [
      {
        type: "link",
        key: "launch_plan",
        labelKey: "nav.launchPlan",
        href: "launch/plan",
        pattern: "D",
      },
      {
        type: "link",
        key: "launch_docs",
        labelKey: "nav.launchDocs",
        href: "launch/docs",
        pattern: "L",
      },
    ],
  },
  {
    type: "section",
    key: "initiative_retrospective",
    labelKey: "nav.initiativeRetrospective",
    children: [
      {
        type: "link",
        key: "retro_metrics",
        labelKey: "nav.retroMetrics",
        href: "retrospective/metrics",
        pattern: "L",
      },
      {
        type: "link",
        key: "retro_review",
        labelKey: "nav.retroReview",
        href: "retrospective/review",
        pattern: "D",
      },
    ],
  },
];

function flattenInitiativeLinks(entries: NavEntry[]): NavLink[] {
  return entries.flatMap((entry) => {
    if (entry.type === "link") return [entry];
    if (entry.type === "group") return entry.children;
    if (entry.type === "section") {
      return entry.children.flatMap((child) =>
        child.type === "link" ? [child] : child.children,
      );
    }
    return [];
  });
}

/** Flat initiative route list for breadcrumbs and route meta. */
export const INITIATIVE_L1: NavLink[] = flattenInitiativeLinks(INITIATIVE_L1_NAV);

export const L0_NAV: NavEntry[] = [
  { type: "link", key: "tasks", labelKey: "nav.tasks", href: "tasks", pattern: "L" },
  {
    type: "link",
    key: "overview",
    labelKey: "nav.overview",
    href: "overview",
    pattern: "H",
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

const INITIATIVE_PATH_RE = /^initiatives\/([^/]+)(?:\/(.*))?$/;

export type L0GroupKey = "executive" | "research" | "manager" | "development" | "design";

export function getRelativeProjectPath(pathname: string, projectBase: string): string {
  return pathname.startsWith(projectBase)
    ? pathname.slice(projectBase.length).replace(/^\//, "")
    : pathname.replace(/^\//, "");
}

export function getExpandedGroupsFromPath(relativePath: string): Record<L0GroupKey, boolean> {
  const expanded = {
    executive: false,
    research: false,
    manager: false,
    development: false,
    design: false,
  };

  if (relativePath.startsWith("executive/") || relativePath === "executive") {
    expanded.executive = true;
  }
  if (relativePath.startsWith("research/") || relativePath === "research") {
    expanded.research = true;
  }
  if (
    MANAGER_ROUTE_PREFIXES.some(
      (prefix) => relativePath === prefix || relativePath.startsWith(`${prefix}/`),
    )
  ) {
    expanded.manager = true;
  }
  if (relativePath.startsWith("development/") || relativePath === "development") {
    expanded.development = true;
  }
  if (relativePath.startsWith("design/") || relativePath === "design") {
    expanded.design = true;
  }

  return expanded;
}

export function initiativePath(ctx: ProjectRouteContext, initiativeId: string, suffix = "") {
  const base = projectPath(ctx, "initiatives", initiativeId);
  return suffix ? `${base}/${suffix}` : base;
}

export function resolveNavHref(ctx: ProjectRouteContext, href: string): string {
  if (!href) return projectPath(ctx);
  return projectPath(ctx, ...href.split("/"));
}

export function parseInitiativeRoute(
  pathname: string,
  projectBase: string,
): { initiativeId: string; suffix: string } | null {
  const relative = getRelativeProjectPath(pathname, projectBase);
  const match = relative.match(INITIATIVE_PATH_RE);
  if (!match) return null;

  return {
    initiativeId: match[1]!,
    suffix: match[2] ?? "",
  };
}

export function getSidebarMode(pathname: string, projectBase: string): SidebarMode {
  return parseInitiativeRoute(pathname, projectBase) ? "l1" : "l0";
}

export function isNavLinkActive(
  pathname: string,
  projectBase: string,
  href: string,
  initiativeId?: string,
): boolean {
  if (initiativeId !== undefined) {
    const full = href
      ? `${projectBase}/initiatives/${initiativeId}/${href}`
      : `${projectBase}/initiatives/${initiativeId}`;
    if (href === "") {
      return pathname === full || pathname === `${full}/`;
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

  const fullPath = href ? `${projectBase}/${href}` : projectBase;
  if (href === "initiatives") {
    return pathname === fullPath || pathname === `${fullPath}/`;
  }
  return pathname === fullPath || pathname.startsWith(`${fullPath}/`);
}

export type BreadcrumbSegment = {
  labelKey: string;
  href?: string;
};

export function buildBreadcrumbSegments(
  pathname: string,
  projectBase: string,
  initiativeTitle?: string,
): BreadcrumbSegment[] {
  const relative = getRelativeProjectPath(pathname, projectBase);

  if (!relative) {
    return [{ labelKey: "nav.overview" }];
  }

  if (relative === "overview") {
    return [{ labelKey: "nav.overview" }];
  }
  if (relative === "tasks" || relative.startsWith("tasks/")) {
    return [{ labelKey: "nav.tasks" }];
  }
  if (relative === "workflow/map") {
    return [{ labelKey: "nav.workflowMap" }];
  }

  if (relative.startsWith("executive/")) {
    const child = EXECUTIVE_L1.find((item) => relative === item.href);
    return [
      { labelKey: "nav.executive" },
      { labelKey: child?.labelKey ?? "nav.executive" },
    ];
  }

  if (relative.startsWith("research/")) {
    const child = RESEARCH_L1.find((item) => relative === item.href);
    return [
      { labelKey: "nav.research" },
      { labelKey: child?.labelKey ?? "nav.research" },
    ];
  }

  const initiative = relative.match(INITIATIVE_PATH_RE);
  if (initiative) {
    const suffix = initiative[2] ?? "";
    const l1 = INITIATIVE_L1.find((item) => item.href === suffix);
    return [
      { labelKey: "nav.manager" },
      { labelKey: initiativeTitle ? "nav.initiativeTitle" : "nav.productInitiatives" },
      ...(l1 ? [{ labelKey: l1.labelKey }] : []),
    ];
  }

  if (relative === "initiatives") {
    return [{ labelKey: "nav.manager" }, { labelKey: "nav.productInitiatives" }];
  }

  if (relative.startsWith("development/")) {
    const child = DEVELOPMENT_L1.find((item) => relative === item.href);
    return [
      { labelKey: "nav.productDev" },
      { labelKey: child?.labelKey ?? "nav.productDev" },
    ];
  }

  if (relative.startsWith("design/")) {
    if (
      relative === "design/ui-components" ||
      relative.startsWith("design/ui-components/")
    ) {
      return [
        { labelKey: "nav.productDesign" },
        { labelKey: "nav.designUiComponents" },
      ];
    }
    const child = DESIGN_L1.find((item) => relative === item.href);
    return [
      { labelKey: "nav.productDesign" },
      { labelKey: child?.labelKey ?? "nav.productDesign" },
    ];
  }

  const managerChild = MANAGER_L1.find((item) => relative === item.href);
  if (managerChild) {
    return [{ labelKey: "nav.manager" }, { labelKey: managerChild.labelKey }];
  }

  if (relative.startsWith("developer/")) {
    return [{ labelKey: "nav.developer" }];
  }
  if (relative.startsWith("settings/")) {
    return [{ labelKey: "nav.settings" }];
  }

  return [{ labelKey: "nav.overview" }];
}

export function isInitiativeScopedRoute(pathname: string, projectBase: string): boolean {
  return parseInitiativeRoute(pathname, projectBase) != null;
}
