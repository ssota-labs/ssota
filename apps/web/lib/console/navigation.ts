import type { ProjectRouteContext } from "./paths";
import { projectPath } from "./paths";

export type PagePatternCode = "H" | "D" | "L" | "T" | "canvas";

export type NavScope = "project" | "evergreen" | "initiative";

export type SidebarMode = "l0" | "l1" | "l2";

export type NavSeparator = { type: "separator" };

export type NavLink = {
  type: "link";
  key: string;
  labelKey: string;
  href: string;
  pattern?: PagePatternCode;
};

export type NavDrilldown = {
  type: "drilldown";
  key: string;
  labelKey: string;
  domain: "executive" | "research" | "product";
  children: NavEntry[];
};

export type NavGroup = {
  type: "group";
  key: string;
  labelKey: string;
  children: NavLink[];
};

export type NavEntry = NavSeparator | NavLink | NavDrilldown | NavGroup;

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

export const PRODUCT_DEV_L1: NavLink[] = [
  {
    type: "link",
    key: "dev_data_model",
    labelKey: "nav.devDataModel",
    href: "product/dev/data-model",
    pattern: "D",
  },
  {
    type: "link",
    key: "dev_system_model",
    labelKey: "nav.devSystemModel",
    href: "product/dev/system-model",
    pattern: "D",
  },
  {
    type: "link",
    key: "dev_api_reference",
    labelKey: "nav.devApiReference",
    href: "product/dev/api-reference",
    pattern: "D",
  },
  {
    type: "link",
    key: "dev_integration",
    labelKey: "nav.devIntegration",
    href: "product/dev/integration",
    pattern: "D",
  },
];

export const PRODUCT_DESIGN_L1: NavLink[] = [
  {
    type: "link",
    key: "design_ia",
    labelKey: "nav.designIa",
    href: "product/design/ia",
    pattern: "T",
  },
  {
    type: "link",
    key: "design_ui_components",
    labelKey: "nav.designUiComponents",
    href: "product/design/ui-components",
    pattern: "D",
  },
  {
    type: "link",
    key: "design_theme",
    labelKey: "nav.designTheme",
    href: "product/design/design-theme",
    pattern: "D",
  },
];

export const PRODUCT_L1: NavEntry[] = [
  {
    type: "link",
    key: "product_initiatives",
    labelKey: "nav.productInitiatives",
    href: "product/initiatives",
    pattern: "L",
  },
  {
    type: "group",
    key: "product_dev",
    labelKey: "nav.productDev",
    children: PRODUCT_DEV_L1,
  },
  {
    type: "group",
    key: "product_design",
    labelKey: "nav.productDesign",
    children: PRODUCT_DESIGN_L1,
  },
];

export const INITIATIVE_L2: NavLink[] = [
  {
    type: "link",
    key: "initiative_overview",
    labelKey: "nav.initiativeOverview",
    href: "",
    pattern: "H",
  },
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
  {
    type: "link",
    key: "design_ia",
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
  {
    type: "link",
    key: "qa_test_plan",
    labelKey: "nav.qaTestPlan",
    href: "qa/test-plan",
    pattern: "D",
  },
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
];

export const L0_NAV: NavEntry[] = [
  { type: "link", key: "tasks", labelKey: "nav.tasks", href: "tasks", pattern: "L" },
  {
    type: "link",
    key: "overview",
    labelKey: "nav.overview",
    href: "overview",
    pattern: "H",
  },
  { type: "separator" },
  {
    type: "drilldown",
    key: "executive",
    labelKey: "nav.executive",
    domain: "executive",
    children: EXECUTIVE_L1,
  },
  {
    type: "drilldown",
    key: "research",
    labelKey: "nav.research",
    domain: "research",
    children: RESEARCH_L1,
  },
  {
    type: "drilldown",
    key: "product",
    labelKey: "nav.product",
    domain: "product",
    children: PRODUCT_L1,
  },
  { type: "separator" },
  {
    type: "link",
    key: "workflow_map",
    labelKey: "nav.workflowMap",
    href: "workflow/map",
    pattern: "canvas",
  },
];

const INITIATIVE_PATH_RE =
  /^product\/initiatives\/([^/]+)(?:\/(.*))?$/;

export function initiativePath(ctx: ProjectRouteContext, initiativeId: string, suffix = "") {
  const base = projectPath(ctx, "product", "initiatives", initiativeId);
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
  const relative = pathname.startsWith(projectBase)
    ? pathname.slice(projectBase.length).replace(/^\//, "")
    : pathname.replace(/^\//, "");

  const match = relative.match(INITIATIVE_PATH_RE);
  if (!match) return null;

  return {
    initiativeId: match[1]!,
    suffix: match[2] ?? "",
  };
}

export function getSidebarMode(pathname: string, projectBase: string): SidebarMode {
  const initiative = parseInitiativeRoute(pathname, projectBase);
  if (initiative) return "l2";

  const relative = pathname.startsWith(projectBase)
    ? pathname.slice(projectBase.length)
    : pathname;

  if (
    relative.startsWith("/executive") ||
    relative.startsWith("/research") ||
    relative.startsWith("/product")
  ) {
    return "l1";
  }

  return "l0";
}

export function getActiveDomain(pathname: string, projectBase: string) {
  const relative = pathname.startsWith(projectBase)
    ? pathname.slice(projectBase.length)
    : pathname;

  if (relative.startsWith("/executive")) return "executive" as const;
  if (relative.startsWith("/research")) return "research" as const;
  if (relative.startsWith("/product")) return "product" as const;
  return null;
}

export function isNavLinkActive(
  pathname: string,
  projectBase: string,
  href: string,
  initiativeId?: string,
): boolean {
  if (initiativeId !== undefined) {
    const full = href
      ? `${projectBase}/product/initiatives/${initiativeId}/${href}`
      : `${projectBase}/product/initiatives/${initiativeId}`;
    if (href === "") {
      return pathname === full || pathname === `${full}/`;
    }
    return pathname === full || pathname.startsWith(`${full}/`);
  }

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
  initiativeTitle?: string,
): BreadcrumbSegment[] {
  const relative = pathname.startsWith(projectBase)
    ? pathname.slice(projectBase.length).replace(/^\//, "")
    : pathname.replace(/^\//, "");

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
    const l2 = INITIATIVE_L2.find((item) => item.href === suffix);
    return [
      { labelKey: "nav.product" },
      { labelKey: initiativeTitle ? "nav.initiativeTitle" : "nav.productInitiatives" },
      ...(l2 ? [{ labelKey: l2.labelKey }] : []),
    ];
  }

  if (relative.startsWith("product/")) {
    const allProductLinks = [
      ...PRODUCT_L1.filter((e): e is NavLink => e.type === "link"),
      ...PRODUCT_DEV_L1,
      ...PRODUCT_DESIGN_L1,
    ];
    const child = allProductLinks.find((item) => relative === item.href);
    if (child) {
      const isDev = PRODUCT_DEV_L1.some((d) => d.href === relative);
      const isDesign = PRODUCT_DESIGN_L1.some((d) => d.href === relative);
      return [
        { labelKey: "nav.product" },
        ...(isDev ? [{ labelKey: "nav.productDev" }] : []),
        ...(isDesign ? [{ labelKey: "nav.productDesign" }] : []),
        { labelKey: child.labelKey },
      ];
    }
    if (relative === "product/initiatives") {
      return [{ labelKey: "nav.product" }, { labelKey: "nav.productInitiatives" }];
    }
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
