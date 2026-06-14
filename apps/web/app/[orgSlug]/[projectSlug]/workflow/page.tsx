import { PageHeader } from "@/components/studio/page-header";
import {
  WorkflowLens,
  type WorkflowLensPhase,
} from "@/components/workflow-lens/workflow-lens";
import { graphPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import { getActionPorts } from "@/lib/ports";

const phaseDefinitions = [
  {
    key: "strategy",
    title: "Strategy",
    description: "Vision, outcomes, and the metrics that define why work matters.",
    nodeTypes: ["Blueprint", "Roadmap", "Objective", "KeyResult", "KPI"],
  },
  {
    key: "discovery",
    title: "Discovery",
    description: "Opportunities, evidence, and experiments before commitment.",
    nodeTypes: ["Opportunity", "ResearchInsight", "Experiment"],
  },
  {
    key: "commit",
    title: "Commit",
    description: "Validated initiatives scheduled against roadmap and release intent.",
    nodeTypes: ["Initiative", "Release"],
  },
  {
    key: "definition",
    title: "Definition",
    description: "Product, design, and technical shaping before delivery.",
    nodeTypes: [
      "PRD",
      "Feature",
      "UserStory",
      "InformationArchitecture",
      "PageWireframe",
      "UserFlow",
      "TechSpec",
      "ADR",
      "ApiReference",
    ],
  },
  {
    key: "delivery",
    title: "Delivery",
    description: "Plans, tests, sprints, tasks, and pull requests.",
    nodeTypes: ["ImplementationPlan", "TestPlan", "Sprint", "Task", "PullRequest"],
  },
  {
    key: "release",
    title: "Release",
    description: "Launch readiness, notes, runbooks, and frozen release artifacts.",
    nodeTypes: ["LaunchPlan", "ReleaseNote", "Runbook", "ApiSnapshot"],
  },
  {
    key: "learning",
    title: "Learning",
    description: "Metric snapshots and retrospectives feeding the next discovery loop.",
    nodeTypes: ["MetricSnapshot", "Retrospective"],
  },
] as const;

export default async function WorkflowPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const ports = getActionPorts(project.id);
  const catalog = await ports.catalog.listNodeCatalogEntries();
  const catalogByType = new Map(catalog.map((entry) => [entry.nodeType, entry]));

  const phases: WorkflowLensPhase[] = await Promise.all(
    phaseDefinitions.map(async (phase) => {
      const types = await Promise.all(
        phase.nodeTypes.flatMap((nodeType) => {
          const entry = catalogByType.get(nodeType);
          if (!entry) return [];
          return [
            ports.graph.queryNodes({ nodeType, limit: 5 }).then((rows) => ({
              nodeType,
              label: entry.label,
              slug: entry.slug,
              description: entry.contentGuide ?? `${entry.family} node`,
              tableHref: `${graphPath(ctx, "nodes")}?table=${entry.slug}`,
              rows: rows.map((row) => ({
                id: row.id,
                nodeType: row.nodeType,
                title: stringValue(row.properties.title) || row.id.slice(0, 8),
                lifecycleStatus: row.lifecycleStatus,
                canonicalUrl:
                  stringValue(row.properties.canonical_url) ||
                  stringValue(row.properties.notion_url) ||
                  stringValue(row.contentUrl),
                content: row.content ?? "",
                updatedAt: row.updatedAt.toISOString(),
                properties: row.properties,
              })),
            })),
          ];
        }),
      );
      return {
        key: phase.key,
        title: phase.title,
        description: phase.description,
        types,
      };
    }),
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Workflow Lens"
        description="Read the graph as a product development system instead of raw tables."
      />
      <WorkflowLens phases={phases} />
    </div>
  );
}

function stringValue(value: unknown): string {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return "";
}
