import { ExecutiveRoadmapWorkspace } from "@/components/console/executive-roadmap-workspace";
import { projectPath } from "@/lib/console/paths";
import { resolveProject } from "@/lib/console/resolve-project";
import {
  createGraphNodeAction,
  updateGraphNodeAction,
} from "@/lib/graph/actions/graph-mutations";
import { ensureEvergreenSingleton } from "@/lib/graph/loaders/ensure-evergreen-singleton";
import { getGraphDeps, queryNodesByType } from "@/lib/graph/graph-deps";
import { loadRoadmapTemplate } from "@/lib/roadmap/load-template";
import {
  sortPlanningRoadmaps,
  toRoadmapNodeView,
} from "@/lib/roadmap/map-node";
import type { DocStatus } from "@/lib/roadmap/doc-status";
import type { RoadmapQuarter } from "@ssota/contracts";

export default async function ExecutiveRoadmapPage({
  params,
}: {
  params: Promise<{ orgSlug: string; projectSlug: string }>;
}) {
  const { orgSlug, projectSlug } = await params;
  const ctx = { orgSlug, projectSlug };
  const { project } = await resolveProject(orgSlug, projectSlug);
  const revalidatePath = projectPath(ctx, "executive", "roadmap");
  const currentYear = new Date().getFullYear();

  const productRoadmapNode = await ensureEvergreenSingleton(
    project.id,
    "product_roadmap",
    "프로덕트 로드맵",
  );
  const planningNodes = await queryNodesByType(project.id, "roadmap");

  const productRoadmap = toRoadmapNodeView(productRoadmapNode);
  const planningRoadmaps = sortPlanningRoadmaps(
    planningNodes.map(toRoadmapNodeView),
  );

  async function saveProductRoadmap(input: {
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) {
    "use server";
    const deps = getGraphDeps(project.id);
    const existing = await deps.graphRead.getNode({
      projectId: project.id,
      nodeId: productRoadmap.id,
    });
    const properties = {
      ...(existing?.properties ?? {}),
      ...(input.docStatus ? { doc_status: input.docStatus } : {}),
    };

    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: productRoadmap.id,
      title: input.title,
      content: input.content,
      properties,
      revalidatePaths: [revalidatePath],
    });
  }

  async function applyProductTemplate() {
    "use server";
    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: productRoadmap.id,
      content: loadRoadmapTemplate("product"),
      properties: { doc_status: "draft" },
      revalidatePaths: [revalidatePath],
    });
  }

  async function savePlanningRoadmap(input: {
    nodeId: string;
    title: string;
    content: string;
    docStatus?: DocStatus;
  }) {
    "use server";
    const deps = getGraphDeps(project.id);
    const existing = await deps.graphRead.getNode({
      projectId: project.id,
      nodeId: input.nodeId,
    });
    const properties = {
      ...(existing?.properties ?? {}),
      ...(input.docStatus ? { doc_status: input.docStatus } : {}),
    };

    await updateGraphNodeAction({
      projectId: project.id,
      nodeId: input.nodeId,
      title: input.title,
      content: input.content,
      properties,
      revalidatePaths: [revalidatePath],
    });
  }

  async function createAnnualRoadmap(year: number) {
    "use server";
    await createGraphNodeAction({
      projectId: project.id,
      nodeType: "roadmap",
      title: `${year} 연간 로드맵`,
      content: loadRoadmapTemplate("annual"),
      properties: {
        kind: "annual",
        year,
        doc_status: "draft",
      },
      revalidatePaths: [revalidatePath],
    });
  }

  async function createQuarterRoadmap(year: number, quarter: RoadmapQuarter) {
    "use server";
    await createGraphNodeAction({
      projectId: project.id,
      nodeType: "roadmap",
      title: `${year} Q${quarter} 분기 로드맵`,
      content: loadRoadmapTemplate("quarter"),
      properties: {
        kind: "quarter",
        year,
        quarter,
        doc_status: "draft",
      },
      revalidatePaths: [revalidatePath],
    });
  }

  return (
    <ExecutiveRoadmapWorkspace
      productRoadmap={productRoadmap}
      planningRoadmaps={planningRoadmaps}
      currentYear={currentYear}
      onSaveProductRoadmap={saveProductRoadmap}
      onApplyProductTemplate={applyProductTemplate}
      onSavePlanningRoadmap={savePlanningRoadmap}
      onCreateAnnualRoadmap={createAnnualRoadmap}
      onCreateQuarterRoadmap={createQuarterRoadmap}
    />
  );
}
