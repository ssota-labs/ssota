import type { NodeType } from "@ssota/contracts";
import { getNodeTypeEntry } from "@ssota/contracts";
import { projectPath, type ProjectRouteContext } from "./paths";

export type WorkflowLensPhaseKey =
  | "execution"
  | "executive"
  | "research"
  | "product"
  | "design"
  | "build"
  | "launch";

export type WorkflowLensTypeConfig = {
  nodeType: NodeType;
  /** Relative path under project for list/table view (no initiative id). */
  tablePath: string;
  description: string;
};

export type WorkflowLensPhaseConfig = {
  key: WorkflowLensPhaseKey;
  title: string;
  description: string;
  types: WorkflowLensTypeConfig[];
};

const TYPE = (
  nodeType: NodeType,
  tablePath: string,
  description: string,
): WorkflowLensTypeConfig => ({ nodeType, tablePath, description });

export const WORKFLOW_LENS_PHASES: WorkflowLensPhaseConfig[] = [
  {
    key: "execution",
    title: "Execution",
    description: "Tasks and workflow overview",
    types: [TYPE("task", "tasks", "Development workflow tasks")],
  },
  {
    key: "executive",
    title: "Executive",
    description: "Roadmaps, objectives, and KPIs",
    types: [
      TYPE("product_roadmap", "executive/roadmap", "Product roadmap document"),
      TYPE("roadmap", "executive/roadmap", "Execution roadmap"),
      TYPE("objective", "executive/goals", "Strategic objectives"),
      TYPE("key_result", "executive/goals", "Key results"),
      TYPE("kpi", "executive/goals", "Key performance indicators"),
    ],
  },
  {
    key: "research",
    title: "Research",
    description: "Market, user research, and hypotheses",
    types: [
      TYPE("market_research", "research/market", "Market research findings"),
      TYPE("user_research", "research/user", "User research insights"),
      TYPE("hypothesis", "research/hypotheses", "Product hypotheses"),
    ],
  },
  {
    key: "product",
    title: "Product",
    description: "Initiatives, releases, and planning artifacts",
    types: [
      TYPE("initiative", "initiatives", "Product initiatives"),
      TYPE("release", "initiatives", "Releases paired with initiatives"),
      TYPE("prd", "initiatives", "Product requirements (initiative scoped)"),
      TYPE("feature", "initiatives", "Features (initiative scoped)"),
      TYPE("user_story", "initiatives", "User stories (initiative scoped)"),
    ],
  },
  {
    key: "design",
    title: "Design",
    description: "IA, wireframes, flows, and design system",
    types: [
      TYPE("information_architecture", "design/ia", "Information architecture"),
      TYPE("page", "design/ia", "Site pages"),
      TYPE("page_wireframe", "initiatives", "Page wireframes (initiative scoped)"),
      TYPE("user_flow", "initiatives", "User flows (initiative scoped)"),
      TYPE("ui_component", "design/ui-components", "UI components"),
      TYPE("design_theme", "design/design-theme", "Design theme tokens"),
    ],
  },
  {
    key: "build",
    title: "Build",
    description: "Architecture, implementation, and delivery",
    types: [
      TYPE("architecture_spec", "development/system-model", "Architecture specifications"),
      TYPE("data_spec", "development/data-model", "Data model specifications"),
      TYPE("integration_spec", "development/integration", "Integration specifications"),
      TYPE("api_reference", "development/api-reference", "API reference docs"),
      TYPE("api_snapshot", "development/api-reference", "API snapshots"),
      TYPE("implementation_plan", "initiatives", "Implementation plans"),
      TYPE("sprint", "initiatives", "Sprint plans"),
      TYPE("pull_request", "initiatives", "Pull requests"),
    ],
  },
  {
    key: "launch",
    title: "QA / Launch / Retro",
    description: "Testing, launch, and retrospective",
    types: [
      TYPE("test_plan", "initiatives", "QA test plans"),
      TYPE("launch_plan", "initiatives", "Launch plans"),
      TYPE("release_note", "initiatives", "Release notes"),
      TYPE("runbook", "initiatives", "Operational runbooks"),
      TYPE("metric_snapshot", "initiatives", "Metric snapshots"),
      TYPE("retrospective", "initiatives", "Retrospectives"),
    ],
  },
];

export function getWorkflowLensTableHref(
  ctx: ProjectRouteContext,
  tablePath: string,
): string {
  return projectPath(ctx, ...tablePath.split("/"));
}

export function getWorkflowLensTypeLabel(nodeType: NodeType): string {
  return getNodeTypeEntry(nodeType)?.label ?? nodeType;
}
