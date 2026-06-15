import type { PagePatternCode, NavScope } from "./navigation";

export type RouteMeta = {
  /** Relative path under project base (no leading slash). */
  path: string;
  pattern: PagePatternCode;
  nodeTypes: string[];
  scope: NavScope;
  titleKey: string;
  ctaKey?: string;
};

const route = (
  path: string,
  pattern: PagePatternCode,
  nodeTypes: string[],
  scope: NavScope,
  titleKey: string,
  ctaKey?: string,
): RouteMeta => ({
  path,
  pattern,
  nodeTypes,
  scope,
  titleKey,
  ctaKey,
});

/** Project-scoped static routes (not initiative L2). */
export const STATIC_ROUTE_METAS: RouteMeta[] = [
  route("overview", "H", ["aggregate"], "project", "nav.overview"),
  route("tasks", "L", ["task"], "project", "nav.tasks", "cta.newTask"),
  route("workflow/map", "canvas", ["all"], "project", "nav.workflowMap"),
  route("executive/roadmap", "D", ["product_roadmap", "roadmap"], "evergreen", "nav.executiveRoadmap", "cta.newDocument"),
  route("executive/goals", "L", ["goal"], "evergreen", "nav.executiveGoals", "cta.newGoal"),
  route("research/market", "L", ["market_research"], "project", "nav.researchMarket", "cta.newMarketResearch"),
  route("research/user", "L", ["user_research"], "project", "nav.researchUser", "cta.newUserResearch"),
  route("research/hypotheses", "L", ["hypothesis"], "project", "nav.researchHypotheses", "cta.newHypothesis"),
  route("product/initiatives", "L", ["initiative"], "project", "nav.productInitiatives", "cta.newInitiative"),
  route("product/dev/data-model", "D", ["data_model"], "evergreen", "nav.devDataModel", "cta.newDocument"),
  route("product/dev/system-model", "D", ["system_model"], "evergreen", "nav.devSystemModel", "cta.newDocument"),
  route("product/dev/api-reference", "D", ["api_reference"], "evergreen", "nav.devApiReference", "cta.newDocument"),
  route("product/dev/integration", "D", ["integration_spec"], "evergreen", "nav.devIntegration", "cta.newDocument"),
  route("product/design/ia", "T", ["information_architecture"], "evergreen", "nav.designIa", "cta.newIaNode"),
  route("product/design/ui-components", "D", ["ui_component_catalog"], "evergreen", "nav.designUiComponents", "cta.newDocument"),
  route("product/design/design-theme", "D", ["design_theme"], "evergreen", "nav.designTheme", "cta.newDocument"),
];

/** Initiative L2 suffixes (under product/initiatives/:id/). */
export const INITIATIVE_ROUTE_METAS: RouteMeta[] = [
  route("", "H", ["initiative"], "initiative", "nav.initiativeOverview"),
  route("planning/prd", "D", ["prd"], "initiative", "nav.planningPrd", "cta.newDocument"),
  route("planning/features", "L", ["feature"], "initiative", "nav.planningFeatures", "cta.newFeature"),
  route("planning/stories", "L", ["user_story"], "initiative", "nav.planningStories", "cta.newStory"),
  route("design/ia", "T", ["ia_diagram"], "initiative", "nav.initiativeDesignIa", "cta.newIaNode"),
  route("design/wireframes", "L", ["wireframe"], "initiative", "nav.designWireframes", "cta.newWireframe"),
  route("design/flows", "D", ["user_flow"], "initiative", "nav.designFlows", "cta.newDocument"),
  route("architecture/spec", "D", ["architecture_spec"], "initiative", "nav.architectureSpec", "cta.newDocument"),
  route("architecture/data", "D", ["data_model"], "initiative", "nav.architectureData", "cta.newDocument"),
  route("architecture/integration", "D", ["integration_spec"], "initiative", "nav.architectureIntegration", "cta.newDocument"),
  route("build/plan", "D", ["build_plan"], "initiative", "nav.buildPlan", "cta.newDocument"),
  route("build/tasks", "L", ["task"], "initiative", "nav.buildTasks", "cta.newTask"),
  route("build/pull-requests", "L", ["pull_request"], "initiative", "nav.buildPullRequests", "cta.newPullRequest"),
  route("qa/test-plan", "D", ["test_plan"], "initiative", "nav.qaTestPlan", "cta.newDocument"),
  route("launch/plan", "D", ["launch_plan"], "initiative", "nav.launchPlan", "cta.newDocument"),
  route("launch/docs", "L", ["launch_doc"], "initiative", "nav.launchDocs", "cta.newDocument"),
  route("retrospective/metrics", "L", ["metric"], "initiative", "nav.retroMetrics", "cta.newMetric"),
  route("retrospective/review", "D", ["retrospective"], "initiative", "nav.retroReview", "cta.newDocument"),
];

export const NODE_DETAIL_ROUTE_META: RouteMeta = route(
  "nodes/:nodeId",
  "D",
  ["*"],
  "project",
  "nav.nodeDetail",
);

const STATIC_ROUTE_MAP = new Map(STATIC_ROUTE_METAS.map((meta) => [meta.path, meta]));

const INITIATIVE_SUFFIX_MAP = new Map(
  INITIATIVE_ROUTE_METAS.map((meta) => [meta.path, meta]),
);

const INITIATIVE_PATH_RE =
  /^product\/initiatives\/([^/]+)(?:\/(.*))?$/;

const NODE_DETAIL_PATH_RE = /^nodes\/([^/]+)$/;

export function getRouteMeta(relativePath: string): RouteMeta | null {
  const normalized = relativePath.replace(/^\/+|\/+$/g, "");

  const nodeMatch = normalized.match(NODE_DETAIL_PATH_RE);
  if (nodeMatch) {
    return { ...NODE_DETAIL_ROUTE_META, path: normalized };
  }

  const initiativeMatch = normalized.match(INITIATIVE_PATH_RE);
  if (initiativeMatch) {
    const suffix = initiativeMatch[2] ?? "";
    return INITIATIVE_SUFFIX_MAP.get(suffix) ?? null;
  }

  return STATIC_ROUTE_MAP.get(normalized) ?? null;
}

/** All navigable console paths for E2E (35 screens). */
export function listAllConsoleRoutePaths(initiativeId: string): string[] {
  const staticPaths = STATIC_ROUTE_METAS.map((meta) => meta.path);
  const initiativePaths = INITIATIVE_ROUTE_METAS.map((meta) =>
    meta.path
      ? `product/initiatives/${initiativeId}/${meta.path}`
      : `product/initiatives/${initiativeId}`,
  );
  const nodeDetail = `nodes/${initiativeId}`;
  return [...staticPaths, ...initiativePaths, nodeDetail];
}
